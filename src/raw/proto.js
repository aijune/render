import $ from "../jquery/index";

const proto = {

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
            raw = new that.constructor(item, that.widget, that);
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
            raw = new that.constructor(item, widget, that);
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
            child = new that.constructor(item, that.widget, that);
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
                    raw = new that.constructor(item, that.widget, that);
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

export default proto;