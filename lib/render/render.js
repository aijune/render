define(["jquery"], function ($) {

    ////----

    var Raw = function (data, render, parent, node) {

        var i, value;

        this.render = render;
        this.parent = parent;
        this.node = node;

        //--

        if(typeof data[0] === "boolean"){
            this.remove = !data[0];
            this.selector = data[1];
            i = 2;
        }
        else{
            this.selector = data[0];
            i = 1;
        }

        for( ; i < data.length; i++){

            value = data[i];

            if($.isPlainObject(value)){
                this.setData(value);
            }
            else if($.isArray(value)){
                this.setChildren(value);
            }
            else{
                this.text = String(value);
            }
        }

        this.remove = this.remove || false;
        this.data = this.data || {};
        this.children = this.children || [];
        this.text = this.text || "";

        if(
            this.selector[0] === "s" && this.selector[1] === "v" && this.selector[2] === "g" &&
            (this.selector.length === 3 || this.selector[3] === "." || this.selector[3] === "#")
        ) {
            this.addNS(this.data, this.children);
        }
    };

    Raw.prototype = {

        constructor: Raw,

        addNS: function(data, children){

            data.ns = "http://www.w3.org/2000/svg";

            $.each(children, function (i, child){
                child.addNS(child.data, child.children);
            });
        },

        setData: function(value){

            var that = this;
            var data = this.data = {};
            var hooks = {}, match;

            $.each(value, function(k, v){
                if(k === "data-key"){
                    that.key = v;
                }
                else if(k === "style" && typeof v !== "string"){
                    data.style = v;
                }
                else if(k === "class" && typeof v !== "string"){
                    data.classes = v;
                }
                else if(match = k.match(/^on(\w+)$/)){
                    if(
                        $.inArray(match[1], [
                            "beforecreate",
                            "created",
                            "mounted",
                            "beforepatch",
                            "beforeupdate",
                            "updated",
                            "patched",
                            "destroy",
                            "remove",
                            "model",
                            "validate",
                            "reset"
                        ]) > -1
                    ){
                        hooks[match[1]] = v;
                    }
                    else{
                        data.events = data.events || {};
                        data.events[match[1]] = v;
                    }
                }
                else{

                    if(k === "data-validate"){
                        if(value.name){
                            that.render.validator.set(value.name, {raw: that, data: v});
                        }
                        else if(value["data-validate-name"]){
                            that.render.validator.set(value["data-validate-name"], {_raw: that, data: v});
                        }
                    }

                    data.attrs = data.attrs || {};
                    data.attrs[k] = typeof v === "object" ? JSON.stringify(v) : v;

                    if(k === "name"){
                        that.render.modeling.setName(v, value, that);
                    }
                    else if(k === "value" && !value.name){
                        that.render.modeling.setValue(v, value, that);
                    }
                }
            });

            this.setHooks(hooks);
        },

        setHooks: function(value){

            var that = this;
            var args = [];
            var slice = args.slice;
            var hooks = this.data.hooks = {};

            $.each(value, function (key, value) {

                if($.isArray(value)){
                    args = slice.call(value, 1);
                    value = value[0];
                }

                if($.isFunction(value)){
                    hooks[key] = function () {
                        return value.apply(that.render, args.concat(slice.call(arguments, 0)));
                    };
                }
                else{
                    $.error("Parameter error:" + value);
                }
            });
        },

        setChildren: function(value){

            var that = this;

            $.each(value, function(i, item){

                that.pushChild(item);
            });
        },

        pushChild: function (child) {
            child = new Raw(child, this.render, this);
            if(!child.remove){
                this.children = this.children || [];
                this.children.push(child);
            }
        }
    };


    ////----

    var selectorReg = /^([\w-]+)(?:#([\w-]+))?(?:\.([\.\w-]+))?$/;
    var eventReg = /^([\w:-]*)\s*(.*)$/;

    var Diff = function(){};

    Diff.prototype = {

        constructor: Diff,

        createRawByNode: function(node, raw){

            var id = node.id ? "#" + node.id : "";
            var classes = node.className ? "." + node.className.split(" ").join(".") : "";

            return new Raw([node.tagName.toLowerCase() + id + classes], (raw ? raw.render : $(node).data("_render")), undefined, $(node).empty()[0]);
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

                    if($.isFunction(value)){
                        value = value.call(raw.render, raw, oldRaw);
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

            this.updateBase(oldRaw, raw, "classes", {

                hook: function(node, oldClasses, classes, callbacks){

                    var that = this;
                    var element = $(node);

                    $.each(classes, function(key, value){

                        var delay, time, d, t;

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

                    $.each(events, function(key, value){

                        if(!oldEvents || !oldEvents[key]){
                            callbacks.add.call(that, node, key, value);
                        }
                        else{
                            callbacks.remove.call(that, node, key);
                            callbacks.add.call(that, node, key, value);
                        }
                    });
                },

                add: function(node, key, value){

                    var match = key.match(eventReg);
                    var eventName = match[1] + raw.render.eventNamespace;
                    var selector = match[2];
                    var args = [];
                    var slice = args.slice;
                    var fn;

                    if($.isArray(value)){
                        args = slice.call(value, 1);
                        value = value[0];
                    }

                    if(!$.isFunction(value)){
                        return;
                    }

                    fn = function(event) {
                        return value.apply(raw.render, args.concat([event, raw, oldRaw]));
                    };

                    if(selector){
                        $(node).on( eventName, selector, fn);
                    }
                    else{
                        $(node).on( eventName, fn);
                    }
                },

                remove: function(node, key){

                    var match = key.match(eventReg);

                    $(node).off(match[1] + raw.render.eventNamespace);
                }
            });
        },

        destroyEvents: function(raw) {
            if(raw.data.events){
                $(raw.node).off(raw.render.eventNamespace);
            }
        },

        destroyClasses: function(raw) {

            this.updateBase(undefined, raw, "classes", {

                hook: function(node, oldClasses, classes, callbacks){

                    var that = this;

                    $.each(classes, function(key, value){
                        if(value.destroy === "add"){
                            callbacks.add.call(that, node, key);
                        }
                        else if(value.destroy === "remove"){
                            callbacks.remove.call(that, node, key);
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

        removeClasses(raw, rm) {

            this.updateBase(undefined, raw, "classes", {

                hook: function(node, oldClasses, classes, callbacks){

                    var that = this;
                    var dfds = [];

                    if($.isEmptyObject(classes)){
                        return rm();
                    }

                    $.each(classes, function(key, value){

                        var time;

                        if($.isArray(value.remove)){
                            time = value.remove[1];
                            value.remove = value.remove[0];
                        }

                        if(value.remove === "add"){
                            callbacks.add.call(that, node, key);
                        }
                        else if(value.remove === "remove"){
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
                        rm();
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

        createNodeByRaw: function(raw, mountedQueue, root) {

            var that = this;
            var data = raw.data;
            var selector, match, element, children;

            if(data.hooks && data.hooks.beforecreate){
                data.hooks.beforecreate.call(raw.render, raw);
                data = raw.data;
            }

            selector = raw.selector;

            if(selector === "!"){
                raw.node = document.createComment(raw.text);
            }
            else{
                match = selectorReg.exec(selector);
                raw.node = data.ns ? document.createElementNS(data.ns, match[1]) : document.createElement(match[1]);
                element = $(raw.node);

                if(match[2]){
                    element.attr("id", match[2]);
                }
                if(match[3]){
                    element.attr("class", match[3].split(".").join(" "));
                }
                if(!root){
                    element.data("_raw", raw);
                }

                this.setData(raw);

                children = raw.children;
                if(children.length){
                    $.each(children, function(i, child){
                        element.append(that.createNodeByRaw(child, mountedQueue));
                    });
                }
                else{
                    element.html(raw.text);
                }

                if(data.hooks){
                    if(data.hooks.created){
                        data.hooks.created.call(raw.render, raw);
                    }
                    if(data.hooks.mounted){
                        mountedQueue.push(raw);
                    }
                }
            }

            return raw.node;
        },

        triggerDestroyHook(raw) {

            var that = this;
            var hooks = raw.data.hooks;

            if(hooks && hooks.destroy){
                hooks.destroy.call(raw.render, raw);
            }

            this.destroyClasses(raw);
            this.destroyEvents(raw);

            $.each(raw.children, function(i, child){
                that.triggerDestroyHook(child);
            });
        },

        removeRaws(raws, startIdx, endIdx) {

            var raw, rm, hooks;

            for (; startIdx <= endIdx; ++startIdx) {

                raw = raws[startIdx];

                if(raw){

                    this.triggerDestroyHook(raw);

                    rm = (function(node, count){
                        return function(){
                            if(--count < 1){
                                $(node).remove();
                            }
                        };
                    })(raw.node, 2);

                    this.removeClasses(raw, rm);

                    hooks = raw.data.hooks;
                    if(hooks && hooks.remove){
                        hooks.remove.call(raw.render, raw, rm);
                    }else{
                        rm();
                    }
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

        addRaws: function(parent, afterNode, raws, startIdx, endIdx, mountedQueue) {

            var raw;

            for (; startIdx <= endIdx; ++startIdx) {
                raw = raws[startIdx];
                if (raw) {
                    this.createNodeByRaw(raw, mountedQueue);
                    afterNode ? $(raw.node).insertBefore(afterNode) : $(raw.node).appendTo(parent);
                }
            }
        },

        updateChildren(parent, oldC, newC, mountedQueue) {

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
                    this.patchRaw(oldStartRaw, newStartRaw, mountedQueue);
                    oldStartRaw = oldC[++oldStartIdx];
                    newStartRaw = newC[++newStartIdx];
                }
                else if (this.sameRaw(oldEndRaw, newEndRaw)) {
                    this.patchRaw(oldEndRaw, newEndRaw, mountedQueue);
                    oldEndRaw = oldC[--oldEndIdx];
                    newEndRaw = newC[--newEndIdx];
                }
                else if (this.sameRaw(oldStartRaw, newEndRaw)) {
                    this.patchRaw(oldStartRaw, newEndRaw, mountedQueue);
                    $(oldStartRaw.node).insertAfter(oldEndRaw.node);
                    oldStartRaw = oldC[++oldStartIdx];
                    newEndRaw = newC[--newEndIdx];
                }
                else if (this.sameRaw(oldEndRaw, newStartRaw)) {
                    this.patchRaw(oldEndRaw, newStartRaw, mountedQueue);
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
                        this.patchRaw(rawToMove, newStartRaw, mountedQueue);
                        oldC[oldIdx] = null;
                        $(rawToMove.node).insertBefore(oldStartRaw.node);
                    }else{
                        $(this.createNodeByRaw(newStartRaw, mountedQueue)).insertBefore(oldStartRaw.node);
                    }
                    newStartRaw = newC[++newStartIdx];
                }
            }
            if (oldStartIdx <= oldEndIdx || newStartIdx <= newEndIdx) {
                if (oldStartIdx > oldEndIdx) {
                    afterNode = newC[newEndIdx + 1] == null ? null : newC[newEndIdx + 1].node;
                    this.addRaws(parent, afterNode, newC, newStartIdx, newEndIdx, mountedQueue);
                }
                else {
                    this.removeRaws(oldC, oldStartIdx, oldEndIdx);
                }
            }
        },

        setPrivHook: function(hook, raw, oldRaw){

            var fn = oldRaw.data.hooks && oldRaw.data.hooks[hook];

            if(fn){
                fn.call(raw.render, raw, oldRaw);
                if(fn.keep){
                    raw.data.hooks = raw.data.hooks || {};
                    raw.data.hooks[hook] = fn;
                }
            }
        },

        updateData: function(oldRaw, raw){
            this.updateAttrs(oldRaw, raw);
            this.updateStyle(oldRaw, raw);
            this.updateClasses(oldRaw, raw);
            this.updateEvents(oldRaw, raw);
        },

        patchRaw: function(oldRaw, raw, mountedQueue, root) {

            var data = raw.data;
            var node, element, oldChildren, children;

            node = raw.node = oldRaw.node;
            element = $(node);
            if(!root){
                element.data("_raw_", raw);
            }

            if(data.hooks && data.hooks.beforeupdate){
                data.hooks.beforeupdate.call(raw.render, raw, oldRaw);
            }
            this.setPrivHook("_beforeupdate_", raw, oldRaw);

            if(data.remove){
                return this.removeRaws([raw], 0, 0);
            }

            this.updateData(oldRaw, raw);

            oldChildren = oldRaw.children;
            children = raw.children;

            if(oldChildren.length && children.length){
                this.updateChildren(node, oldChildren, children, mountedQueue);
            }
            else if(children.length){
                if(oldRaw.text){
                    element.empty();
                }
                this.addRaws(node, null, children, 0, children.length - 1, mountedQueue);
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

            data = raw.data;
            if(data.hooks && data.hooks.updated){
                data.hooks.updated.call(raw.render, raw, oldRaw);
            }
        },

        patch: function(oldRaw, raw) {
            var mountedQueue = [];

            if(!oldRaw && !raw){
                return;
            }

            if(!oldRaw){
                raw.mountedQueue = [];
                this.createNodeByRaw(raw, raw.mountedQueue, true);
            }
            else if(!raw){
                if(oldRaw.constructor !== Raw){
                    oldRaw = this.createRawByNode(oldRaw);
                }
                this.removeRaws([oldRaw], 0, 0);
            }
            else{
                if(oldRaw.constructor !== Raw){
                    oldRaw = this.createRawByNode(oldRaw, raw);
                }
                raw.mountedQueue = [];
                this.patchRaw(oldRaw, raw, raw.mountedQueue, true);

                $.each(raw.mountedQueue, function(i, raw){
                    raw.data.hooks.mounted.call(raw.render, raw);
                });
            }

            return raw;
        }
    };


    ////----


    var Model = function (fragment) {
        this.fragment = fragment;
        this.map = {};
        this.state = "init";
        this._map = {};
    };

    Model.prototype = {

        constructor: Model,

        init: function(){

            var that = this;
            var fragment = this.fragment;
            var updateProxy = function (event) {
                that.update.call(that, event);
            };
            var resetProxy = function(event){
                that.reset.call(that, event);
            };

            fragment.element
                .on("input" + fragment.eventNamespace, "input, textarea", updateProxy)
                .on("propertychange" + fragment.eventNamespace, "input, textarea", updateProxy)
                .on("change" + fragment.eventNamespace, "select", updateProxy)
                .on("reset" + fragment.eventNamespace, "form", resetProxy);

            $.each(this._map, function (name, data) {

                var item = that.map[name];

                if($.isArray(item.value) && !item.value.length){
                    item.value.push(data.value);
                    item.sel.push(data.sel);
                }
                else if(!item.value){
                    that.map[name] = data;
                }
            });

            this._mapReset = this._copy(this.map);
            this.state = "update";
        },

        _copy: function(map){

            var result = {};

            $.each(map, function (key, data) {
                result[key] = {
                    value: $.isArray(data.value) ? $.extend([], data.value) : data.value,
                    sel: data.sel
                }
            });

            return result;
        },

        get: function(name){

            if(name){
                return this.map[name];
            }
            else{
                return this.map;
            }

        },

        closestSel: function(tag, sel){
            while (sel && sel.sel.indexOf(tag) !== 0) {
                sel = sel.parent;
            }
            return sel;
        },

        setName: function(name, data, sel){

            if(this.state === "init"){
                this._setNameInit(name, data, sel);
            }
            else if(this.state === "update"){
                this._setNameUpdate(name, data, sel);
            }
        },

        _setNameInit: function(name, data, sel){

            var item = this.map[name] = this.map[name] || {};

            if(data.type === "radio"){
                item.value = item.value || "";
                item.sel = item.sel || null;
                if(data.checked){
                    item.value = data.value;
                    item.sel = sel;
                }
            }
            else if(data.type === "checkbox"){
                item.value = item.value || [];
                item.sel = item.sel || [];
                if(data.checked){
                    item.value.push(data.value);
                    item.sel.push(sel);
                }
            }
            else if(sel.sel.indexOf("select") !== 0){
                item.value = data.value;
                item.sel = sel;
            }
        },

        _setNameUpdate: function(name, data, sel){

            var item = this.map[name];

            if(data.type === "radio"){
                if(data.value === item.value){
                    sel.data.attrs.checked = data.checked = "checked";
                }
                else{
                    sel.data.attrs.checked = data.checked = undefined;
                }
            }
            else if(data.type === "checkbox"){
                if($.inArray(data.value, item.value) > -1){
                    sel.data.attrs.checked = data.checked = "checked";
                }
                else{
                    sel.data.attrs.checked = data.checked = undefined;
                }
            }
            else if(sel.sel.indexOf("select") !== 0){
                sel.data.attrs.value = data.value = item.value;
            }
        },

        setValue: function(value, data, sel){

            if(this.state === "init"){
                this._setValueInit(value, data, sel);
            }
            else if(this.state === "update"){
                this._setValueUpdate(value, data, sel);
            }

        },

        _setValueInit: function(value, data, sel){

            var name, p, attrs, item;

            if(sel.sel.indexOf("option") === 0){

                p = this.closestSel("select", sel);
                attrs = p.data.attrs || {};
                name = attrs.name;

                if(name){

                    if(!this._map[name]){
                        this._map[name] = {value: value, sel: sel};
                    }

                    item = this.map[name] = this.map[name] || {};

                    if(attrs.multiple){
                        item.value = item.value || [];
                        item.sel = item.sel || [];
                        if(data.selected){
                            item.value.push(value);
                            item.sel.push(sel);
                        }
                    }else{
                        item.value = item.value || "";
                        item.sel = item.sel || null;
                        if(data.selected){
                            item.value = value;
                            item.sel = sel;
                        }
                    }
                }
            }
        },

        _setValueUpdate: function(value, data, sel){
            var name, p, attrs, item;

            if(sel.sel.indexOf("option") === 0){
                p = this.closestSel("select", sel);
                attrs = p.data.attrs || {};
                name = attrs.name;

                if(name){
                    item = this.map[name];
                    if(attrs.multiple){
                        if($.inArray(value, item.value) > -1){
                            sel.data.attrs.selected = data.selected = "selected";
                        }
                        else{
                            sel.data.attrs.selected = data.selected = undefined;
                        }
                    }else{
                        if(value === item.value){
                            sel.data.attrs.selected = data.selected = "selected";
                        }
                        else{
                            sel.data.attrs.selected = data.selected = undefined;
                        }
                    }
                }
            }
        },

        reset: function(event){

            var that = this;

            this.map = this._copy(this._mapReset);

             $(event.currentTarget.elements).each(function (i, element) {

                 var sel, hooks, name, value;

                 element = $(element);
                 sel = element.data("_sel");
                 hooks = sel.data.hooks;
                 name = sel.data.attrs && sel.data.attrs.name;
                 value = name && that.map[name];

                 if(hooks){

                     if(hooks.model){
                         hooks.model.call(that.fragment.renderWidget, event, sel, value);
                     }

                     if(hooks.reset){
                         hooks.reset.call(that.fragment.renderWidget, event, sel, value);
                     }

                 }
             });
        },

        update: function(event){

            var target = $(event.currentTarget);
            var name = target.attr("name");

            if(!this.map.hasOwnProperty(name)){
                return false;
            }

            var sel = target.data("_sel");
            var attrs = sel.data.attrs;
            var validate = this.fragment.instValidate;
            var value;

            if(target.is("select")){

                value = {
                    value: [],
                    sel: []
                };

                target.find("option:selected").each(function (i, option) {
                    option = $(option);
                    value.value.push(option.attr("value"));
                    value.sel.push(option.data("_sel"));
                });

                if(!target.prop("multiple")){
                    value.value = value.value[0];
                    value.sel = value.sel[0];
                }
            }
            else{
                value = target.val();

                if(attrs && !target.is("radio") && !target.is("checkbox")){
                    attrs.value = value;
                }
            }

            this._update(event, name, value, sel, attrs);

            if(validate.get(name)){
                validate.validate(name);
            }

            return false;
        },

        _update: function (event, name, value, sel, attrs) {

            var item = this.map[name];
            var index;

            if(attrs.type === "radio"){
                item.value = value;
                item.sel = sel;
            }
            else if(attrs.type === "checkbox"){
                index = $.inArray(value, item.value);
                if(index > -1){
                    item.value.splice(index, 1);
                    item.sel.splice(index, 1);
                }else{
                    item.value.push(value);
                    item.sel.push(sel);
                }
            }
            else if(sel.sel.indexOf("select") === 0){
                this.map[name] = value;
            }
            else{
                item.value = value;
            }

            if(sel.data.hooks && sel.data.hooks.model){
                sel.data.hooks.model.call(this.fragment.renderWidget, event, sel, value);
            }
        }

    };

    ////----

    var Validate = function(fragment){
        this.fragment = fragment;
        this.map = {};
    };

    Validate.prototype = {

        constructor: Validate,

        set: function(name, value){
            this.map[name] = value;
        },

        get: function(name){
            return this.map[name];
        },

        validate: function(name){

            if(name){
                return this._item(name);
            }
            else{
                return this._all();
            }

        },

        _item: function(name){

            var that = this;
            var item = this.map[name];
            var sel = item.sel;

            if(!sel && item._sel){
                this._setSel(name, item);
                sel = item.sel;
            }

            var value = this.fragment.instModel.get(name).value;
            var result = true;

            if($.isArray(sel)){
                $.each(sel, function (i, s) {
                    result = item["state"] = that._validate(s.node, item.data, value, s);
                });
            }
            else{
                result = item["state"] = this._validate(sel.node, item.data, value, sel);
            }

            return result;
        },

        _all: function(){

            var that = this;
            var result = true;
            var fragment = this.fragment;

            $.each(this.map, function (name, item) {
                var value = fragment.model(name);
                var sel = item.sel;

                if(!sel && item._sel){
                    that._setSel(name, item);
                    sel = item.sel;
                }

                if($.isArray(sel)){
                    $.each(sel, function (i, s) {
                        item["state"] = that._validate(s.node, item.data, value, s);
                    });
                }
                else{
                    item["state"] = that._validate(sel.node, item.data, value, sel);
                }

                if(!item["state"]){
                    result = false;
                }

            });

            return result;
        },

        _setSel: function(name, item){
            item.sel = [];
            this.fragment.element.find("[name='" + name + "']").each(function (i, element) {
                item.sel.push($(this).data("_sel"));
            });
        },

        _validate: function(target, data, value, sel){

            var that = this;
            var widget = this.fragment.renderWidget;
            var rule, validate, result = true;

            if($.isArray(data)){
                $.each(data, function (i, dat) {
                    result = that._validate(target, dat, value, sel);
                    if(!result){
                        return false;
                    }
                });
                return result;
            }
            else if($.isPlainObject(data)){

                rule = data.rule;

                if($.isFunction(rule)){
                    rule = rule.call(widget.element[0], value, target);
                }

                if($.type(rule) === "regexp"){
                    result = data.rule.test(value);
                }
                else if($.type(rule) === "string" && this.rules[rule]){
                    result = this.rules[rule].call(this, value, target);
                }
                else if($.isArray(rule) && this.rules[rule[0]]){
                    result = this.rules[rule[0]].call(this, value, target, rule[1]);
                }

                validate = sel.data.hooks && sel.data.hooks.validate;

                if(validate){
                    if(!!result){
                        validate.call(widget, sel, {valid: true, feedback: data.valid || ""});
                    }
                    else{
                        validate.call(widget, sel, {valid: false, feedback: data.invalid || ""});
                    }
                }

                return !!result;
            }
        },

        rules: {}
    };


    ////----


    $.fn.render = function(data, render, factory){

        return this.each(function (i, elem) {
            $.render(elem, data, render, factory);
        });
    };

    $.render = function(elem, data, render, methods){

        if($.isFunction(data)){
            methods = render;
            render = data;
            data = undefined;
        }

        return new Render(elem, {
            data: data,
            render: render,
            methods: methods
        });
    };


    ////----


    var renderUuid = 0;

    var Render = function (node, options) {

        this.node = node;
        this.uuid = renderUuid++;
        this.eventNamespace = "._render_" + this.uuid;

        $.data(this.node, "_render_", this);

        if($.isFunction(options)){
            this.render = options;
        }
        else{

            this.render = options.render;
            this.data = options.data || {};
            this.m = {};

            if(options.methods){
                $.extend(this.m, options.methods);
            }
        }

        this.init();
    };

    Render.prototype = {

        constructor: Render,

        diff: new Diff(),

        createHooks: {},

        updateHooks: {},

        destroyHooks: {},

        init: function () {

            var that = this;
            var hook;

            this.modeling = new Model(this);
            this.validator = new Validate(this);

            this.createRaw();
            this.checkRoot();
            this.patch();

            if(
                this.raw &&
                (hook = this.raw.data.hooks) &&
                (hook = hook.mounted)
            ){
                hook.call(this, this.raw);
            }

            //--

            if(!$.isEmptyObject(this.modeling.map)){
                this.modeling.init();
            }

            //--

            $.each(this.createHooks, function (key, hook) {
                hook.call(that);
            });
        },

        createRaw: function () {
            var rawData = this.render(this.data, this);
            var raw = new Raw(rawData, this);

            this.raw = !raw.remove ? raw : null;
        },

        checkRoot: function(update){

            var element = $(this.node);
            var match, raw;

            if(this.raw){

                match = selectorReg.exec(this.raw.selector);

                if(!element.is(match[1])){
                    $.error("Render root tag error:" + match[1]);
                }

                if(update){
                    if(raw = element.data("_raw_")){
                        this.mergeRaw(this.raw, raw, update);
                    }
                }
                else{
                    if(raw = element.data("_raw_")){
                        return this.mergeRaw(this.raw, raw);
                    }
                    else{
                        element.attr({
                            id: match[2],
                            class: match[3] && match[3].split(".").join(" ")
                        });
                    }
                }
            }
        },

        mergeRaw: function(target, source, update){

            var mt = selectorReg.exec(target.selector);
            var ms = selectorReg.exec(source.selector);
            var id = mt[2] || ms[2];
            var classes;

            if(ms[3]){
                classes = ms[3].split(".");
            }

            if(mt[3]){
                classes = (classes || []).concat(mt[3].split("."));
            }

            target.selector = mt[1];

            if(id){
                target.selector += "#" + id;
                this.node.id = id;
            }

            if(classes){
                classes = this.unique(classes);
                target.selector += "." + classes.join(".");
                this.node.className = classes.join(" ");
            }

            target.data.style = $.extend({}, source.data.style, target.data.style);
            target.data.classes = $.extend({}, source.data.classes, target.data.classes);
        },

        unique: function(arr){

            var hash = [];
            var leng = arr.length;
            var i;

            for (i = 0; i < leng; i++) {
                if(hash.indexOf(arr[i]) === -1){
                    hash.push(arr[i]);
                }
            }

            return hash;
        },

        patch: function () {
            this.diff.patch(this.oldRaw || this.node, this.raw);
            this.oldRaw = this.raw;
        },

        update: function (fn) {

            var that = this;

            if($.isFunction(fn)){
                fn(this.data);
            }

            clearTimeout(this.timeout);

            this.timeout = setTimeout(function () {

                that.createRaw();
                that.checkRoot(true);
                that.patch();

                $.each(that.updateHooks, function (key, hook) {
                    hook.call(that);
                });
            });

        },

        destroy: function(){

            var that = this;

            $.each(this.destroyHooks, function (key, hook) {
                hook.call(that);
            });
        },

        hook: function (nodes, hook, fn, keep) {

            $(nodes).each(function (i, node) {
                var render;
                var raw = $(node).data("_raw_");

                if(!raw && (render = $(node).data("_render_"))){
                    raw = render.raw;
                }

                if(raw){
                    raw.data.hooks = raw.data.hooks || {};
                    raw.data.hooks[hook] = function (raw, oldRaw) {
                        fn(raw, oldRaw, i, node);
                    };
                    raw.data.hooks[hook]["keep"] = keep;
                }
            });
        }

    };

    Render.component = function(name, options){
        Render.prototype.c = Render.prototype.c || {};
        Render.prototype.c[name] = options;
    };

    $.Render = Render;


    ////----扩展$(selector).ready();



    if(!$.fn.selector){

        $.fn.init = (function (orig) {

            return function (selector, context, root) {
                var inst = orig.call(this, selector, context, root);
                inst.selector = selector;
                return inst;
            }

        })($.fn.init);

        $.fn.init.prototype = $.fn;
    }

    $.fn.ready = (function (orig) {

        return function (fn) {
            var that = this;

            if(this[0] === document){
                return orig.call(this, fn);
            }
            else{
                if(this.length){
                    fn.call(this[0], $);
                }
                else{
                    $.Deferred(function (dfd) {
                        var element;
                        var time = 3000;
                        var interval = setInterval(function () {
                            element = $(that.selector);
                            if(element.length){
                                clearInterval(interval);
                                dfd.resolveWith(element[0], $);
                            }
                            else{
                                time -= 50;
                                if(time <= 0){
                                    clearInterval(interval);
                                }
                            }
                        }, 50);
                    }).done(fn);
                }
                return this;
            }
        }

    })($.fn.ready);

});