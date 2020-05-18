define(["jquery"], function ($) {

    var widgetUuid = 0;
    var widgetSlice = Array.prototype.slice;

    $.cleanData = ( function( orig ) {
        return function( elems ) {
            var events, elem, i;
            for ( i = 0; ( elem = elems[ i ] ) != null; i++ ) {
                try {
                    events = $._data( elem, "events" );
                    if ( events && events.remove ) {
                        $( elem ).triggerHandler( "remove" );
                    }
                } catch ( e ) {}
            }
            orig( elems );
        };
    } )( $.cleanData );

    $.widgetExtend = function( target ) {
        var input = widgetSlice.call( arguments, 1 );
        var inputIndex = 0;
        var inputLength = input.length;
        var key;
        var value;

        for ( ; inputIndex < inputLength; inputIndex++ ) {
            for ( key in input[ inputIndex ] ) {
                value = input[ inputIndex ][ key ];
                if ( input[ inputIndex ].hasOwnProperty( key ) && value !== undefined ) {
                    if ( $.isPlainObject( value ) ) {
                        target[ key ] = $.isPlainObject( target[ key ] ) ?
                            $.widgetExtend( {}, target[ key ], value ) :
                            $.widgetExtend( {}, value );
                    } else {
                        target[ key ] = value;
                    }
                }
            }
        }
        return target;
    };

    ////----

    var Sel = {

        parser: /(?:(^|#|\.)([^#\.\[\]]+))|(\[(.+?)(?:\s*=\s*("|'|)((?:\\["'\]]|.)*?)\5)?\])/g,

        cache: {},

        compile: function(selector) {
            var match, tag = "div", classes = [], data = {};

            if(selector && (match = this.cache[selector])){
                return match;
            }

            while (match = this.parser.exec(selector)){
                var type = match[1], value = match[2];
                if (type === "" && value !== "") {
                    tag = value;
                }
                else if (type === "#") data.id = value;
                else if (type === ".") classes.push(value);
                else if (match[3][0] === "[") {
                    var attrValue = match[6];
                    if (attrValue) attrValue = attrValue.replace(/\\(["'])/g, "$1").replace(/\\\\/g, "\\");
                    if (match[4] === "class") classes.push(attrValue);
                    else data[match[4]] = attrValue === "" ? attrValue : attrValue || true;
                }
            }

            if (classes.length > 0) data.class = classes;
            return this.cache[selector] = {tag: tag, data: data};
        }
    };

    ////----

    var Raw = function (vnode, widget, parent, node) {
        var sel, DCT;

        this.widget = widget;
        this.parent = parent;
        this.render = parent ? parent.render : widget.renders.main;
        this.args = parent ? parent.args : [widget.options, widget];
        this.node = node;
        this.selector = vnode[0];

        sel = Sel.compile(this.selector);
        this.tag = sel.tag;

        if(this.tag === "render"){
            return this.setRender(sel.data.name, vnode[1]);
        }

        if(this.tag === "slot"){
            return this.setSlot(sel.data.name, vnode[1]);
        }

        DCT = this.getDCT(vnode.slice(1));
        DCT.data = $.widgetExtend({}, this.transClassStyle(sel.data), this.transClassStyle(DCT.data));

        if(this.tag === "widget"){
            return this.setWidget(DCT);
        }

        this.setData(DCT.data);
        this.setChildren(DCT.children);
        this.text = DCT.text;

        //svg

        if(/^svg/.test(this.selector)) {
            this.addNS(this.data, this.children);
        }
    };

    Raw.prototype = {

        constructor: Raw,

        formatClass: function(classes){
            var result = {};

            if(classes == null || typeof classes === "boolean"){
                return;
            }
            if(typeof classes === "string"){
                classes = classes.split(/\s+/);
            }
            if($.isArray(classes)){
                $.each(classes, function (i, item) {
                    if(item == null || typeof item === "boolean"){
                        return;
                    }
                    if(typeof item === "string"){
                        result[item] = {init: "add"};
                    }
                    else if(typeof item === "object"){
                        result[item.name] = {
                            init: item.init,
                            delay: item.delay,
                            destroy: item.destroy
                        };
                    }
                });
            }
            else if(typeof classes === "object"){
                $.each(classes, function (key, value) {
                    if($.isPlainObject(value)){
                        result[key] = value;
                    }
                    else{
                        result[key] = {init: !!value ? "add" : "remove"};
                    }
                });
            }

            return result;
        },

        formatStyle: function(style){
            var result = {};

            if(style == null || typeof style === "boolean"){
                return;
            }
            if(typeof style === "string"){
                style = style.split(/;\s*/);
                $.each(style, function(i, item){
                    if(item){
                        item = item.split(/:\s*/);
                        result[item[0]] = item[1];
                    }
                });
            }
            else if(typeof style === "object"){
                result = style;
            }

            return result;
        },

        transClassStyle: function(data){
            data.class = this.formatClass(data.class);
            if(!data.class){
                delete data.class;
            }
            data.style = this.formatStyle(data.style);
            if(!data.style){
                delete data.style;
            }

            return data;
        },

        getDCT: function(data){
            var that = this;
            var result = {}, i = 0, v, children = [];

            if($.isPlainObject(data[0])){
                result.data = data[0];
                i = 1;
            }
            for( ; i < data.length; i++){
                v = data[i];
                if($.isArray(v)){
                    this.getArrayChild(v, children);
                }
                else if(v != null && typeof v !== "boolean"){
                    children.push(String(v));
                }
            }
            if(children.length === 1 && typeof children[0] === "string"){
                result.text = children[0];
            }
            else if(children.length > 0){
                result.children = children;
            }

            result = {
                data: result.data || {},
                children: result.children || [],
                text: result.text || ""
            };

            that._setEventHook(result.data);
            return result;
        },

        _setEventHook: function(data){
            var that = this;
            $.each(data, function (key, value) {
                var args = [];
                if(/^on/.test(key)){
                    that._proxyEventHook(key, value, data);
                }
                else if(typeof value === "object"){
                    that._setEventHook(value);
                }
            });
        },

        _proxyEventHook: function(key, value, data){
            var that = this;
            var args = [];

            if($.isArray(value)){
                args = widgetSlice.call(value, 1);
                value = value[0];
            }

            delete data[key];

            if(value == null || typeof value === "boolean"){
                return;
            }
            if($.isFunction(value)){
                $.each(key.split(/,\s*/), function (i, k) {
                    data[k] = function () {
                        return value.apply(that.widget, args.concat(widgetSlice.call(arguments, 0)));
                    };
                });
            }
            else{
                return $.error("event/hook error: " + value);
            }
        },

        getArrayChild: function(child, children){
            var that = this;
            if(typeof child[0] === "string"){
                children.push(child);
            }
            else{
                $.each(child, function(i, c){
                    if($.isArray(c)){
                        that.getArrayChild(c, children);
                    }
                    else if(c != null && typeof c !== "boolean"){
                        children.push(String(c));
                    }
                });
            }
        },

        setRender: function(name, data, notRaw) {
            var that = this;
            var widget = this.widget;
            var args = [widget.options, widget];
            var result = [];
            var render;

            if(!name || !(render = widget.renders[name])){
                $.error("render error: " + this.selector);
            }

            if($.isArray(data)){
                $.each(data, function (i, item) {
                    result = result.concat(that.setRenderItem(render, [item, i].concat(args), notRaw));
                });
            }
            else{
                if(data){
                    args = [data].concat(args);
                }
                result = result.concat(this.setRenderItem(render, args, notRaw));
            }

            if(notRaw){
                return result;
            }
        },

        setRenderItem: function(render, args, notRaw){
            var that = this;
            var result = render.apply(this.widget, args);
            var raw, parent;

            result = this.formatVnode(result);
            if(notRaw){
                return result;
            }

            this.render = render;
            this.args = args;
            $.each(result, function (i, item) {
                raw = new Raw(item, that.widget, that);
                if(raw.tag !== "render" && raw.tag !== "slot"){
                    parent = that.parent;
                    while (parent.tag === "render" || parent.tag === "slot"){
                        parent = parent.parent;
                    }
                    raw.parent = parent;
                    parent.children.push(raw);
                }
            });
        },

        formatVnode: function(vnode){
            var that = this;
            var result = [];

            if(vnode == null || typeof vnode === "boolean"){
                return result;
            }
            else if($.isArray(vnode)){
                if(typeof vnode[0] === "string"){
                    result.push(vnode);
                }
                else{
                    $.each(vnode, function (i, item) {
                        result = result.concat(that.formatVnode(item));
                    });
                }
            }
            else{
                result.push(["span", String(vnode)]);
            }

            return result;
        },

        setSlot: function(name, handle, notRaw){
            var that = this;
            var handle = handle;
            var widget = this.widget;
            var slot, vnode, raw;

            if(!name){
                $.error("slot error: " + this.selector);
            }
            if(!handle || !(slot = widget.options.slots[name])){
                return notRaw ? [] : undefined;
            }

            vnode = handle.call(widget, slot, widget.options, widget);
            vnode = this.formatVnode(vnode);

            if(notRaw){
                return vnode;
            }
            $.each(vnode, function (i, item) {
                raw = new Raw(item, widget, that);
                raw.parent = that.parent.tag !== "render" ? that.parent : that.parent.parent;
                raw.parent.children.push(raw);
            });
        },

        setWidget: function(DCT){
            var that = this;
            var name = DCT.data.name;
            var slots = DCT.data.slots = {
                default: {
                    data: {},
                    children: [],
                    text: ""
                }
            };

            if(!name || !render.widgets[name]){
                $.error("widget error: " + this.selector);
            }

            $.each(DCT.children, function (i, child) {
                var match, sel, DCT;
                if($.isArray(child) && (match = child[0].match(/^slot(?:.*)\[name=(\w+)\](?:.*)$/))){
                    sel = Sel.compile(child[0]);
                    DCT = that.getDCT(child.slice(1));
                    DCT.data = $.widgetExtend({}, that.transClassStyle(sel.data), that.transClassStyle(DCT.data));
                    slots[match[1]] = DCT;
                }
                else{
                    slots.default.children.push(child);
                }
            });
            if(DCT.text){
                slots.default.text = DCT.text;
            }

            $.each(slots, function (key, slot) {
                var result = [];
                $.each(slot.children, function (i, child) {
                    result = result.concat(that.formatWidgetChildren(child));
                });
                slot.children = result;
            });

            this.tag = DCT.data.tag || render.widgets[name]["prototype"]["defaultTag"];
            this.children = [];
            this.text = "";
            this.data = {
                hooks: {
                    create: function (raw) {
                        var widget = new render.widgets[name](raw.node, DCT.data);
                    },
                    update: function (raw) {
                        var widget = $(raw.node).data("widgets-" + name);
                        if(widget){
                            widget.update(DCT.data);
                        }
                    },
                    destroy: function (raw) {
                        var widget = $(raw.node).data("widgets-" + name);
                        if(widget){
                            widget.destroy(DCT.data);
                        }
                    }
                }
            };
        },

        formatWidgetChildren: function(child){
            var that = this;
            var result = [];
            var match, DCT;

            if(typeof child === "string"){
                return [child];
            }

            if(
                (match = child[0].match(/^slot(?:.*)\[name=(\w+)\](?:.*)$/)) &&
                $.isFunction(child[1])
            ){
                child = that.setSlot(match[1], child[1], true);
                $.each(child, function (i, c) {
                    result = result.concat(that.formatWidgetChildren(c));
                });
                return result;
            }
            else if(match = child[0].match(/^render\[name=(\w+)\]$/)){
                child = that.setRender(match[1], child[1], true);
                $.each(child, function (i, c) {
                    result = result.concat(that.formatWidgetChildren(c));
                });
                return result;
            }
            else{
                DCT = that.getDCT(child.slice(1));
                $.each(DCT.children, function (i, child) {
                    result = result.concat(that.formatWidgetChildren(child));
                });
                return [[child[0], DCT.data, result.length ? result : DCT.text]];
            }
        },

        setData: function(value){

            var that = this;
            var data = this.data = {};
            var match;

            $.each(value, function(k, v){
                if(k === "key"){
                    that.key = v;
                }
                else if(k === "style"){
                    data.style = v;
                }
                else if(k === "class"){
                    data.class = v;
                }
                else if(match = k.match(/^on(\w+)$/)){
                    if($.inArray(match[1], ["create", "update", "destroy"]) > -1){
                        data.hooks = data.hooks || {};
                        data.hooks[match[1]] = v;
                    }
                    else{
                        data.events = data.events || {};
                        data.events[match[1]] = v;
                    }
                }
                else{
                    data.attrs = data.attrs || {};
                    data.attrs[k] = typeof v === "object" ? JSON.stringify(v) : v;
                }
            });
        },

        setChildren: function(value){
            var that = this;
            var child;

            this.children = [];

            $.each(value, function (i, item) {
                if(item == null || typeof item === "boolean"){
                    return;
                }
                if(typeof item === "string"){
                    item = ["span", item];
                }
                child = new Raw(item, that.widget, that);
                if($.inArray(child.tag, ["render", "slot"]) < 0){
                    that.children.push(child);
                }
            });
        },

        addNS: function(data, children){
            data.ns = "http://www.w3.org/2000/svg";
            $.each(children, function (i, child){
                child.addNS(child.data, child.children);
            });
        },

        update: function(value, callback){
            var that = this;
            var delay, result, raw;

            if($.isFunction(value)){
                value.call(this.widget, this.args[0]);
            }
            else{
                $.widgetExtend(this.args[0], value);
            }

            if(callback){
                this.updateCallbacks = this.updateCallbacks || [];
                this.updateCallbacks.push(callback);
            }

            if(!this.updating){
                this.updating = true;
                delay = window.requestAnimationFrame || window.setTimeout;
                delay(function () {
                    that.updating = false;
                    result = that.render.apply(that.widget, that.args);
                    result = that.formatVnode(result);
                    $.each(result, function (i, item) {
                        raw = new Raw(item, that.widget, that);
                        that.patchRaws([raw]);
                    });

                    //--

                    $.each(that.updateCallbacks, function (i, callback) {
                        callback.call(that.widget, that.args[0]);
                    });
                    that.updateCallbacks = undefined;
                });
            }
        },

        patchRaws: function(raws){
            var that = this;
            $.each(raws, function (i, raw) {
                if(raw.tag === "render" || raw.tag === "slot"){
                    that.patchRaws(raw.children);
                }
                else{
                    that.widget.diff.patch(that.renderTopRaw(), raw);
                }
            });
        },

        renderTopRaw: function () {
            var raw = this;
            var parent = this.parent;
            while(parent.render === raw.render){
                raw = parent;
                parent = parent.parent;
            }
            return raw;
        }
    };

    ////----

    var Diff = function(){};

    Diff.prototype = {

        constructor: Diff,

        getNodeData: function(node){
            var data = {};
            $.each(node.attributes, function (i, item) {
                data[item.name] = item.value
            });
            return data;
        },

        createRawByNode: function(node, widget){
            return new Raw([node.tagName.toLowerCase(), this.getNodeData(node)], widget, undefined, $(node).empty()[0]);
        },

        sameRaw: function(oldRaw, raw){
            return oldRaw.key === raw.key && oldRaw.selector === raw.selector;
        },

        updateBase: function(oldRaw, raw, prop, callbacks){
            var oldProp, key;
            var newProp = raw.data[prop] || {};
            var node = raw.node;

            if(oldRaw && (oldProp = oldRaw.data[prop] || {})){
                for(key in oldProp){
                    if(newProp[key] === undefined){
                        callbacks.remove.call(this, node, key);
                    }
                }
            }

            if(callbacks.hook){
                callbacks.hook.call(this, node, oldProp, newProp, callbacks);
            }
            else{
                if(oldProp){
                    for(key in newProp){
                        if(oldProp[key] !== newProp[key]){
                            callbacks.add.call(this, node, key, newProp[key]);
                        }
                    }
                }
                else{
                    for(key in newProp){
                        callbacks.add.call(this, node, key, newProp[key]);
                    }
                }
            }
        },

        isFormNode: function (node){
            return $.inArray(node.tagName.toLowerCase(), ["input", "select", "textarea"]) > -1;
        },

        updateAttrs: function(oldRaw, raw){

            this.updateBase(oldRaw, raw, "attrs", {

                add: function (node, key, value) {
                    if(key === "value" && this.isFormNode(node)){
                        $(node).val(value);
                    }else{
                        $(node).attr(key, value);
                    }
                },

                remove: function (node, key) {
                    if(key === "value" && this.isFormNode(node)){
                        $(node).val("");
                    }else{
                        $(node).removeAttr(key);
                    }
                }
            });
        },

        updateStyle: function(oldRaw, raw) {

            this.updateBase(oldRaw, raw, "style", {

                add: function(node, key, value){
                    var args = [];

                    if($.isArray(value)){
                        args = value;
                        value = args.shift();
                    }

                    if($.isFunction(value)){
                        value = value.apply(raw.widget, args.concat([raw, oldRaw]));
                    }

                    $(node).css(key, value);
                },

                remove: function(node, key){
                    $(node).css(key, "");
                }

            });
        },

        nextFrame: function(callback, time){

            var that = this;
            var timeout;

            if(time){
                setTimeout(function(){
                    callback.call(that);
                }, time);
            }
            else{
                timeout = window.requestAnimationFrame || window.setTimeout;
                timeout(function(){
                    timeout(function () {
                        callback.call(that);
                    });
                });
            }
        },

        updateClasses: function(oldRaw, raw) {

            this.updateBase(oldRaw, raw, "class", {

                hook: function(node, oldClasses, classes, callbacks){

                    var that = this;
                    var element = $(node);

                    $.each(classes, function(key, value){

                        var delay, time, d, t;

                        delay = value.delay;

                        if($.isArray(value.delay)){
                            time = value.delay[1];
                            delay = value.delay[0];
                            if($.isArray(time)){
                                d = time[0];
                                t = time[1];
                                time = undefined;
                            }
                            if($.isArray(delay)){
                                time = delay[1];
                                delay = delay[0];
                            }
                        }

                        if(element.hasClass(key)){
                            if(value.init === "add"){
                                if(delay === "remove"){
                                    that.nextFrame(function(){
                                        callbacks.remove.call(that, node, key);
                                        if(d === "add"){
                                            that.nextFrame(function(){
                                                callbacks.add.call(that, node, key);
                                            }, t);
                                        }
                                    }, time);
                                }
                            }else{
                                callbacks.remove.call(that, node, key);
                                if(delay === "add"){
                                    that.nextFrame(function(){
                                        callbacks.add.call(that, node, key);
                                        if(d === "remove"){
                                            that.nextFrame(function(){
                                                callbacks.remove.call(that, node, key);
                                            }, t);
                                        }
                                    }, time);
                                }
                            }
                        }else{
                            if(value.init === "add"){
                                callbacks.add.call(that, node, key);
                                if(delay === "remove"){
                                    that.nextFrame(function(){
                                        callbacks.remove.call(that, node, key);
                                        if(d === "add"){
                                            that.nextFrame(function(){
                                                callbacks.add.call(that, node, key);
                                            }, t);
                                        }
                                    }, time);
                                }
                            }else{
                                if(delay === "add"){
                                    that.nextFrame(function(){
                                        callbacks.add.call(that, node, key);
                                        if(d === "remove"){
                                            that.nextFrame(function(){
                                                callbacks.remove.call(that, node, key);
                                            }, t);
                                        }
                                    }, time);
                                }
                            }
                        }
                    });
                },

                add: function(node, key){
                    $(node).addClass(key);
                },

                remove: function(node, key){
                    $(node).removeClass(key);
                }
            });
        },

        updateEvents: function(oldRaw, raw){

            this.updateBase(oldRaw, raw, "events", {

                hook: function(node, oldEvents, events, callbacks){
                    var that = this;
                    var handle = raw.handle = (oldRaw && oldRaw.handle) || function (e) {
                        var name = e.type;
                        var events = handle.raw.data.events;
                        if (events && events[name]) {
                            events[name](e, raw, oldRaw);
                        }
                    };
                    handle.raw = raw;
                    $.each(events, function(key, value){
                        if(!oldEvents || !oldEvents[key]){
                            callbacks.add.call(that, node, key, handle);
                        }
                    });
                },

                add: function(node, key, handle){
                    var match = key.match(/^([\w:-]*)\s*(.*)$/);
                    var eventName = match[1] + raw.widget.eventNamespace;
                    var selector = match[2];
                    if(selector){
                        $(node).on( eventName, selector, handle);
                    }
                    else{
                        $(node).on( eventName, handle);
                    }
                },

                remove: function(node, key){
                    var match = key.match(/^([\w:-]*)\s*(.*)$/);
                    $(node).off(match[1] + raw.widget.eventNamespace);
                }
            });
        },

        destroyEvents: function(raw) {
            if(raw.data.events){
                $(raw.node).off(raw.widget.eventNamespace);
            }
        },

        destroyClasses(raw, rm) {

            this.updateBase(undefined, raw, "class", {

                hook: function(node, oldClasses, classes, callbacks){

                    var that = this;
                    var dfds = [];

                    if($.isEmptyObject(classes)){
                        return rm && rm();
                    }

                    $.each(classes, function(key, value){

                        var time;

                        if($.isArray(value.destroy)){
                            time = value.destroy[1];
                            value.destroy = value.destroy[0];
                        }

                        if(value.destroy === "add"){
                            callbacks.add.call(that, node, key);
                        }
                        else if(value.destroy === "remove"){
                            if(time){
                                dfds.push($.Deferred(function (dfd) {
                                    that.nextFrame(function(){
                                        callbacks.remove.call(that, node, key);
                                        dfd.resolve();
                                    }, time);
                                }));
                            }
                            else{
                                callbacks.remove.call(that, node, key);
                            }
                        }
                    });

                    $.when.apply($, dfds).done(function () {
                        rm && rm();
                    });
                },

                add: function(node, key){
                    $(node).addClass(key);
                },

                remove: function(node, key){
                    $(node).removeClass(key);
                }
            });
        },

        setData: function(raw){
            this.updateAttrs(undefined, raw);
            this.updateStyle(undefined, raw);
            this.updateClasses(undefined, raw);
            this.updateEvents(undefined, raw);
        },

        createNodeByRaw: function(raw, createQueue, root) {

            var that = this;
            var data = raw.data;
            var tag, element, children;

            tag = raw.tag;

            if(tag === "!"){
                raw.node = document.createComment(raw.text);
            }
            else{
                raw.node = data.ns ? document.createElementNS(data.ns, tag) : document.createElement(tag);
                element = $(raw.node);

                if(!root){
                    element.data("_raw_", raw);
                }

                this.setData(raw);

                children = raw.children;
                if(children.length){
                    $.each(children, function(i, child){
                        element.append(that.createNodeByRaw(child, createQueue));
                    });
                }
                else{
                    element.html(raw.text);
                }

                if(data.hooks && data.hooks.create){
                    createQueue.push(raw);
                }
            }

            return raw.node;
        },

        destroyChildren(children) {
            var that = this;
            $.each(children, function(i, child){
                var hooks = child.data.hooks;

                that.destroyClasses(child);
                that.destroyEvents(child);

                if(hooks && hooks.destroy){
                    hooks.destroy(child);
                }
                that._hook("destroy", child);

                that.destroyChildren(child.children);
            });
        },

        removeRaws(raws, startIdx, endIdx) {

            var raw, rm, hooks;

            for (; startIdx <= endIdx; ++startIdx) {

                raw = raws[startIdx];

                if(raw){

                    this.destroyChildren(raw.children);

                    rm = (function(raw, count){
                        return function(){
                            if(--count < 1){
                                $(raw.node).remove();
                            }
                        };
                    })(raw, 3);

                    this.destroyClasses(raw, rm);
                    this.destroyEvents(raw);

                    if((hooks = raw.data.hooks) && hooks.destroy){
                        hooks.destroy(raw, rm);
                    }else{
                        rm();
                    }

                    this._hook("destroy", raw, rm);
                }
            }
        },

        createKeyToIdx: function(raws, startIdx, endIdx) {

            var i, map = {}, raw, key;

            for (i = startIdx; i <= endIdx; ++i) {
                raw = raws[i];
                if(raw && (key = raw.key)){
                    map[key] = i;
                }
            }

            return map;
        },

        addRaws: function(parent, afterNode, raws, startIdx, endIdx, createQueue) {

            var raw;

            for (; startIdx <= endIdx; ++startIdx) {
                raw = raws[startIdx];
                if (raw) {
                    this.createNodeByRaw(raw, createQueue);
                    afterNode ? $(raw.node).insertBefore(afterNode) : $(raw.node).appendTo(parent);
                }
            }
        },

        updateChildren(parent, oldC, newC, createQueue) {

            var oldStartIdx = 0, newStartIdx = 0;
            var oldEndIdx = oldC.length - 1;
            var oldStartRaw = oldC[0];
            var oldEndRaw = oldC[oldEndIdx];
            var newEndIdx = newC.length - 1;
            var newStartRaw = newC[0];
            var newEndRaw = newC[newEndIdx];
            var oldKeyToIdx;
            var oldIdx;
            var rawToMove;
            var afterNode;

            while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
                if (oldStartRaw == null) {
                    oldStartRaw = oldC[++oldStartIdx];
                }
                else if (oldEndRaw == null) {
                    oldEndRaw = oldC[--oldEndIdx];
                }
                else if (newStartRaw == null) {
                    newStartRaw = newC[++newStartIdx];
                }
                else if (newEndRaw == null) {
                    newEndRaw = newC[--newEndIdx];
                }
                else if (this.sameRaw(oldStartRaw, newStartRaw)) {
                    this.patchRaw(oldStartRaw, newStartRaw, createQueue);
                    oldStartRaw = oldC[++oldStartIdx];
                    newStartRaw = newC[++newStartIdx];
                }
                else if (this.sameRaw(oldEndRaw, newEndRaw)) {
                    this.patchRaw(oldEndRaw, newEndRaw, createQueue);
                    oldEndRaw = oldC[--oldEndIdx];
                    newEndRaw = newC[--newEndIdx];
                }
                else if (this.sameRaw(oldStartRaw, newEndRaw)) {
                    this.patchRaw(oldStartRaw, newEndRaw, createQueue);
                    $(oldStartRaw.node).insertAfter(oldEndRaw.node);
                    oldStartRaw = oldC[++oldStartIdx];
                    newEndRaw = newC[--newEndIdx];
                }
                else if (this.sameRaw(oldEndRaw, newStartRaw)) {
                    this.patchRaw(oldEndRaw, newStartRaw, createQueue);
                    $(oldEndRaw.node).insertBefore(oldStartRaw.node);
                    oldEndRaw = oldC[--oldEndIdx];
                    newStartRaw = newC[++newStartIdx];
                }
                else {
                    oldKeyToIdx = oldKeyToIdx || this.createKeyToIdx(oldC, oldStartIdx, oldEndIdx);
                    if(newStartRaw.key
                        && (oldIdx = oldKeyToIdx[newStartRaw.key])
                        && (rawToMove = oldC[oldIdx])
                        && (rawToMove.selector === newStartRaw.selector)
                    ){
                        this.patchRaw(rawToMove, newStartRaw, createQueue);
                        oldC[oldIdx] = null;
                        $(rawToMove.node).insertBefore(oldStartRaw.node);
                    }else{
                        $(this.createNodeByRaw(newStartRaw, createQueue)).insertBefore(oldStartRaw.node);
                    }
                    newStartRaw = newC[++newStartIdx];
                }
            }
            if (oldStartIdx <= oldEndIdx || newStartIdx <= newEndIdx) {
                if (oldStartIdx > oldEndIdx) {
                    afterNode = newC[newEndIdx + 1] == null ? null : newC[newEndIdx + 1].node;
                    this.addRaws(parent, afterNode, newC, newStartIdx, newEndIdx, createQueue);
                }
                else {
                    this.removeRaws(oldC, oldStartIdx, oldEndIdx);
                }
            }
        },

        _hook: function(hook, raw, oldRaw){
            var hooks = $(raw.node).data("_hook_");
            var fn;

            if(hooks){
                fn = hooks[hook];
            }

            if(fn){
                fn(raw, oldRaw);
                if(!fn.keep){
                    delete hooks[hook];
                }
            }
            else if($.isFunction(oldRaw)){
                oldRaw();
            }
        },

        updateData: function(oldRaw, raw){
            this.updateAttrs(oldRaw, raw);
            this.updateStyle(oldRaw, raw);
            this.updateClasses(oldRaw, raw);
            this.updateEvents(oldRaw, raw);
        },

        patchRaw: function(oldRaw, raw, createQueue, root) {

            var data = raw.data;
            var node, element, oldChildren, children;

            node = raw.node = oldRaw.node;
            element = $(node);
            if(!root){
                element.data("_raw_", raw);
            }

            if(data.hooks && data.hooks.update){
                data.hooks.update(raw, oldRaw);
            }
            this._hook("update", raw, oldRaw);

            if(data.remove){
                return this.removeRaws([raw], 0, 0);
            }

            this.updateData(oldRaw, raw);

            oldChildren = oldRaw.children;
            children = raw.children;

            if(oldChildren.length && children.length){
                this.updateChildren(node, oldChildren, children, createQueue);
            }
            else if(children.length){
                if(oldRaw.text){
                    element.empty();
                }
                this.addRaws(node, null, children, 0, children.length - 1, createQueue);
            }
            else if(oldChildren.length){
                this.removeRaws(oldChildren, 0, oldChildren.length - 1);
                element.html(raw.text);
            }
            else{
                if(oldRaw.text !== raw.text){
                    element.html(raw.text);
                }
            }
        },

        patch: function(oldRaw, raw) {

            if(!oldRaw && !raw){
                return;
            }

            if(!oldRaw){
                raw.createQueue = [];
                this.createNodeByRaw(raw, raw.createQueue, true);
            }
            else if(!raw){
                this.removeRaws([oldRaw], 0, 0);
            }
            else{
                raw.createQueue = [];
                this.patchRaw(oldRaw, raw, raw.createQueue, true);

                $.each(raw.createQueue, function(i, raw){
                    raw.data.hooks.create(raw);
                });
            }

            return raw;
        }
    };

    var render = function(element, widget, options){
        if(widget.renders){
            widget = render.widget("render" + widgetUuid++, widget);
        }
        new widget( element, options || {} );
    };

    var widgets = render.widgets = {};

    render.$ = $;
    render.widget = function( name, base, prototype ) {
        var constructor, basePrototype;
        var proxiedPrototype = {};

        if ( !prototype ) {
            prototype = base;
            base = render.Widget;
        }

        constructor = widgets[ name ] = function( element, options ) {
            if ( !this._createWidget ) {
                return new constructor( element, options );
            }
            if ( arguments.length ) {
                this._createWidget( element, options );
            }
        };

        constructor._childConstructors = [];
        basePrototype = new base();
        basePrototype.options = $.widgetExtend( {}, basePrototype.options );

        $.each( prototype, function( prop, value ) {
            if ( !$.isFunction( value ) ) {
                proxiedPrototype[ prop ] = value;
                return;
            }
            proxiedPrototype[ prop ] = ( function() {
                function _super() {
                    return base.prototype[ prop ].apply( this, arguments );
                }

                function _superApply( args ) {
                    return base.prototype[ prop ].apply( this, args );
                }

                return function() {
                    var __super = this._super;
                    var __superApply = this._superApply;
                    var returnValue;

                    this._super = _super;
                    this._superApply = _superApply;

                    returnValue = value.apply( this, arguments );

                    this._super = __super;
                    this._superApply = __superApply;

                    return returnValue;
                };
            } )();
        } );
        constructor.prototype = $.widgetExtend( basePrototype, proxiedPrototype, {
            constructor: constructor,
            widgetName: name
        } );

        base._childConstructors.push( constructor );
        return constructor;
    };

    render.Widget = function() {};
    render.Widget._childConstructors = [];
    render.Widget.prototype = {
        widgetName: "widget",
        defaultTag: "div",
        diff: new Diff(),
        options: {
            slots: {}
        },
        renders: {},

        _createWidget: function( element, options ) {
            this.node = $( element )[ 0 ];
            this.uuid = widgetUuid++;
            this.eventNamespace = "." + this.widgetName + this.uuid;
            this.bindings = $();

            $.data( this.node, "widgets-" + this.widgetName, this );

            this.options = $.widgetExtend( {}, this.options, options );
            this._create();
        },

        _create: function(){
            var create;

            this._createRaw();
            this._mergeRaw();
            this._patch();

            if(create = this._getHook("create")){
                create(this.raw);
            }
        },

        _createRaw: function () {
            var that = this;
            var main = this.renders["main"];
            var vnode, destroy;

            if(!$.isFunction(main)){
                $.error("render error: main");
            }

            vnode = main.call(this, this.options, this);
            if($.isArray(vnode)){
                while($.isArray(vnode[0])){
                    vnode = vnode.length > 1 ? ["this", vnode] : vnode[0];
                }
                if(!/^this[#\.\[]*/.test(vnode[0])){
                    vnode = ["this", vnode];
                }
            }
            else if(vnode != null && typeof vnode !== "boolean"){
                vnode = ["this", String(vnode)];
            }
            else{
                return this.raw = null;
            }

            this.raw = new Raw(vnode, this);

            destroy = this._getHook("destroy");
            this.raw.data.hooks = this.raw.data.hooks || {};
            this.raw.data.hooks.destroy = function (raw, rm) {
                that._destroy();
                destroy ? destroy(raw, rm) : rm();
            };
        },

        _getHook: function(name){
            var hook;
            if(this.raw &&
                (hook = this.raw.data.hooks) &&
                (hook = this.raw.data.hooks[name])){
                return hook;
            }
            else{
                return null;
            }
        },

        _mergeRaw: function(){
            var element;

            if(this.raw){
                element = $(this.node);
                this.raw.tag = element.prop("tagName").toLowerCase();

                if(!this.defaultRaw){
                    this.defaultRaw = element.data("_raw_") || this.diff.createRawByNode(this.node, this);
                }

                if(this.defaultRaw.data.style){
                    this.raw.data.style = $.widgetExtend({}, this.defaultRaw.data.style, this.raw.data.style);
                }
                if(this.defaultRaw.data.class){
                    this.raw.data.class = $.widgetExtend({}, this.defaultRaw.data.class, this.raw.data.class);
                }
                if(this.defaultRaw.data.attrs){
                    this.raw.data.attrs = $.widgetExtend({}, this.defaultRaw.data.attrs, this.raw.data.attrs);
                }
            }
        },

        _patch: function () {
            this.diff.patch(this.oldRaw || this.defaultRaw, this.raw);
            this.oldRaw = this.raw;
        },

        _class: function(){
            var raw = Raw.prototype;
            var result = {};
            var leng = arguments.length;
            var i = 0;
            for( ; i < leng; i++){
                $.extend(result, raw.formatClass(arguments[i]));
            }
            return result;
        },

        _render: function(render){
            var args = widgetSlice.call(arguments, 1);
            var raw = Raw.prototype;
            var result = [];
            var vnode;

            render = this.renders[render];
            if(!$.isFunction(render)){
                $.error("render error: " + render);
            }

            vnode = render.apply(this, args.concat([this.options, this]));
            vnode = raw.formatVnode(vnode);
            $.each(vnode, function (i, item) {
                result = result.concat(raw.formatWidgetChildren(item));
            });
            return result;
        },

        _delay: function( handler, delay ) {
            function handlerProxy() {
                return ( typeof handler === "string" ? instance[ handler ] : handler )
                    .apply( instance, arguments );
            }
            var instance = this;
            return setTimeout( handlerProxy, delay || 0 );
        },

        _update: function (value, callback) {
            var that = this;
            var delay;

            if($.isFunction(value)){
                value.call(that, this.options);
            }
            else{
                $.widgetExtend(this.options, value);
            }

            if(callback){
                this.updateCallbacks = this.updateCallbacks || [];
                this.updateCallbacks.push(callback);
            }

            if(!this.updating){
                this.updating = true;
                delay = window.requestAnimationFrame || window.setTimeout;
                delay(function () {
                    that.updating = false;
                    that._createRaw();
                    that._mergeRaw();
                    that._patch();

                    //--

                    $.each(that.updateCallbacks, function (i, callback) {
                        callback.call(that, that.options);
                    });
                    that.updateCallbacks = undefined;
                });
            }
        },

        _destroy: function(){
            $(this.node)
                .off( this.eventNamespace )
                .removeData( this.widgetName );

            this.bindings.off( this.eventNamespace );

            $(this.node).empty();
        },

        update: function(options){
            $.widgetExtend( this.options, options );
            this._update();
        },

        destroy: function(){
            this._destroy();
        },

        _on: function( element, handlers ) {
            var delegateElement;
            var instance = this;

            if ( !handlers ) {
                handlers = element;
                element = delegateElement = $(this.node);
            } else {
                element = delegateElement = $( element );
                this.bindings = this.bindings.add( element );
            }

            $.each( handlers, function( event, handler ) {
                function handlerProxy(e) {
                    var raw, args = [e];

                    if(raw = $(e.currentTarget).data("_raw_")){
                        args.push(raw);
                    }

                    return ( typeof handler === "string" ? instance[ handler ] : handler )
                        .apply( instance, args );
                }

                if ( typeof handler !== "string" ) {
                    handlerProxy.guid = handler.guid =
                        handler.guid || handlerProxy.guid || $.guid++;
                }

                var match = event.match( /^([\w:-]*)\s*(.*)$/ );
                var eventName = match[ 1 ] + instance.eventNamespace;
                var selector = match[ 2 ];

                if ( selector ) {
                    delegateElement.on( eventName, selector, handlerProxy );
                } else {
                    element.on( eventName, handlerProxy );
                }
            } );
        },

        _off: function( element, eventName ) {
            eventName = ( eventName || "" ).split( " " ).join( this.eventNamespace + " " ) +
                this.eventNamespace;
            $( element ).off( eventName ).off( eventName );

            this.bindings = $( this.bindings.not( element ).get() );
        },

        _trigger: function( type, event, data ) {
            var prop, orig;
            var callback = this.options[ type ];

            data = data || {};
            event = $.Event( event );
            event.type = type.toLowerCase();
            event.target = this.node;

            orig = event.originalEvent;
            if ( orig ) {
                for ( prop in orig ) {
                    if ( !( prop in event ) ) {
                        event[ prop ] = orig[ prop ];
                    }
                }
            }

            this.element.trigger( event, data );
            return !( $.isFunction( callback ) &&
                callback.apply( this.element[ 0 ], [ event ].concat( data ) ) === false ||
                event.isDefaultPrevented() );
        }
    };

    return render;

});
