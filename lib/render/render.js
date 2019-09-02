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

        isRaw: true,

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

    var Dom = function(){};

    Dom.prototype = {

        constructor: Dom,

        createSelByNode: function(node, sel){
            var id = node.id ? "#" + node.id : "";
            var classes = node.className ? "." + node.className.split(/\s+/).join(".") : "";
            return new Sel([node.tagName.toLowerCase() + id + classes], (sel ? sel.fragment : $(node).data("ui-fragment")), undefined, $(node).empty()[0]);
        },

        sameSel: function(oldSel, sel){
            return oldSel.key === sel.key && oldSel.sel === sel.sel;
        },

        updateBase: function(oldSel, sel, prop, callbacks){

            var oldProp, key;
            var newProp = sel.data[prop] || {};
            var elem = sel.node;

            if(oldSel && (oldProp = oldSel.data[prop] || {})){
                for(key in oldProp){
                    if(newProp[key] == null){
                        callbacks.remove.call(this, elem, key);
                    }
                }
            }

            if(callbacks.hook){
                callbacks.hook.call(this, elem, oldProp, newProp, callbacks);
                return;
            }

            if(oldProp){
                for(key in newProp){
                    if(oldProp[key] !== newProp[key]){
                        callbacks.add.call(this, elem, key, newProp[key]);
                    }
                }
            }else{
                for(key in newProp){
                    callbacks.add.call(this, elem, key, newProp[key]);
                }
            }
        },

        updateAttrs: function(oldSel, sel){

            var that = this;

            this.updateBase(oldSel, sel, "attrs", {

                add: function (elem, key, value) {
                    if(key === "value" && that.isFormElem(elem)){
                        $(elem).val(value);
                    }else{
                        $(elem).attr(key, value);
                    }
                },

                remove: function (elem, key) {
                    if(key === "value" && that.isFormElem(elem)){
                        $(elem).val("");
                    }else{
                        $(elem).removeAttr(key);
                    }
                }
            });
        },

        updateProps: function(oldSel, sel){

            var that = this;

            this.updateBase(oldSel, sel, "props", {

                add: function(elem, key, value){
                    if(key === "value" && that.isFormElem(elem)){
                        $(elem).val(value);
                    }else{
                        $(elem).prop(key, value);
                    }
                },

                remove: function(elem, key){
                    if(key === "value" && that.isFormElem(elem)){
                        $(elem).val("");
                    }else{
                        $(elem).removeProp(key);
                    }
                }

            });
        },

        isFormElem: function (elem){
            return $.inArray(elem.tagName.toLowerCase(), ["input", "select", "textarea"]) > -1;
        },

        updateStyle: function(oldSel, sel) {

            this.updateBase(oldSel, sel, "style", {

                add: function(elem, key, value){

                    if($.isFunction(value)){
                        value = value.call(sel.widget || sel.fragment.element[0], sel, oldSel);
                    }

                    $(elem).css(key, value);
                },

                remove: function(elem, key){
                    $(elem).css(key, "");
                }

            });
        },

        updateDataset: function(oldSel, sel){

            this.updateBase(oldSel, sel, "dataset", {

                add: function(elem, key, value){
                    $(elem).data(key, value);
                },

                remove: function(elem, key){
                    $(elem).removeData(key);
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

        updateClasses: function(oldSel, sel) {

            var that = this;

            this.updateBase(oldSel, sel, "classes", {

                hook: function(elem, oldClasses, classes, callbacks){

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

                        if($(elem).hasClass(key)){
                            if(value.init === "add"){
                                if(delay === "remove"){
                                    that.nextFrame(function(){
                                        callbacks.remove.call(that, elem, key);
                                        if(d === "add"){
                                            that.nextFrame(function(){
                                                callbacks.add.call(that, elem, key);
                                            }, t);
                                        }
                                    }, time);
                                }
                            }else{
                                callbacks.remove.call(that, elem, key);
                                if(delay === "add"){
                                    that.nextFrame(function(){
                                        callbacks.add.call(that, elem, key);
                                        if(d === "remove"){
                                            that.nextFrame(function(){
                                                callbacks.remove.call(that, elem, key);
                                            }, t);
                                        }
                                    }, time);
                                }
                            }
                        }else{
                            if(value.init === "add"){
                                callbacks.add.call(that, elem, key);
                                if(delay === "remove"){
                                    that.nextFrame(function(){
                                        callbacks.remove.call(that, elem, key);
                                        if(d === "add"){
                                            that.nextFrame(function(){
                                                callbacks.add.call(that, elem, key);
                                            }, t);
                                        }
                                    }, time);
                                }
                            }else{
                                if(delay === "add"){
                                    that.nextFrame(function(){
                                        callbacks.add.call(that, elem, key);
                                        if(d === "remove"){
                                            that.nextFrame(function(){
                                                callbacks.remove.call(that, elem, key);
                                            }, t);
                                        }
                                    }, time);
                                }
                            }
                        }
                    });
                },

                add: function(elem, key){
                    $(elem).addClass(key);
                },

                remove: function(elem, key){
                    $(elem).removeClass(key);
                }
            });
        },

        updateEvents: function(oldSel, sel){

            var that = this;
            var reg = /^([\w:-]*)\s*(.*)$/;

            this.updateBase(oldSel, sel, "events", {

                hook: function(elem, oldEvents, events, callbacks){

                    $.each(events, function(key, value){

                        if(!oldEvents || !oldEvents[key]){
                            callbacks.add.call(that, elem, key, value);
                        }
                        else{
                            callbacks.remove.call(that, elem, key);
                            callbacks.add.call(that, elem, key, value);
                        }
                    });
                },

                add: function(elem, key, value){
                    var match = key.match(reg);
                    var eventName = match[1] + sel.fragment.eventNamespace;
                    var selector = match[2];
                    var args = [];
                    var slice = args.slice;

                    if($.isArray(value)){
                        args = slice.call(value, 1);
                        value = value[0];
                    }

                    function handlerProxy(event) {

                        var isString = typeof value === "string";

                        if(isString && (!sel.widget || !sel.widget[value])){
                            $.error("Widget does not exist or widget method \"" + value + "\" does not exist.");
                        }

                        return ( isString ? sel.widget[value] : value )
                            .apply(sel.widget || sel.fragment, args.concat([event, sel]));
                    }

                    if ( typeof value !== "string" ) {
                        handlerProxy.guid = value.guid =
                            value.guid || handlerProxy.guid || $.guid++;
                    }

                    if(selector){
                        $(elem).on( eventName, selector, handlerProxy);
                    }else{
                        $(elem).on( eventName, handlerProxy);
                    }
                },

                remove: function(elem, key){
                    var match = key.match(reg);
                    $(elem).off(match[1] + sel.fragment.eventNamespace);
                }
            });
        },

        destroyEvents: function(sel) {
            if(sel.data.events){
                $(sel.node).off(sel.fragment.eventNamespace);
            }
        },

        destroyClasses: function(sel) {

            var that = this;

            this.updateBase(null, sel, "classes", {

                hook: function(elem, oldClasses, classes, callbacks){

                    $.each(classes, function(key, value){
                        if(value.destroy === "add"){
                            callbacks.add.call(that, elem, key);
                        }
                        else if(value.destroy === "remove"){
                            callbacks.remove.call(that, elem, key);
                        }
                    });
                },

                add: function(elem, key){
                    $(elem).addClass(key);
                },

                remove: function(elem, key){
                    $(elem).removeClass(key);
                }

            });
        },

        removeClasses(sel, rm) {

            var that = this;

            this.updateBase(null, sel, "classes", {

                hook: function(elem, oldClasses, classes, callbacks){

                    var dfds = [];

                    if($.isEmptyObject(classes)){
                        rm();
                        return;
                    }

                    $.each(classes, function(key, value){

                        var time;

                        if($.isArray(value.remove)){
                            time = value.remove[1];
                            value.remove = value.remove[0];
                        }

                        if(value.remove === "add"){
                            callbacks.add.call(that, elem, key);
                        }
                        else if(value.remove === "remove"){
                            if(time){
                                dfds.push($.Deferred(function (dfd) {
                                    that.nextFrame(function(){
                                        callbacks.remove.call(that, elem, key);
                                        dfd.resolve();
                                    }, time);
                                }));
                            }
                            else{
                                callbacks.remove.call(that, elem, key);
                            }
                        }
                    });

                    $.when.apply($, dfds).done(function () {
                        rm();
                    });
                },

                add: function(elem, key){
                    $(elem).addClass(key);
                },

                remove: function(elem, key){
                    $(elem).removeClass(key);
                }
            });
        },

        createElemBySel: function(sel, mountedQueue) {
            var that = this;
            var data = sel.data;
            var hooks = data.hooks;
            var beforeCreate = hooks && hooks.beforecreate;
            var selector, children, match, elem, $elem;

            if(beforeCreate){
                beforeCreate.call(sel.widget || sel.fragment, sel);
                data = sel.data;
                hooks = data.hooks;
            }

            selector = sel.sel;
            children = sel.children;

            if(selector === "!"){
                sel.node = document.createComment(text);
            }else{
                match = selReg.exec(selector);
                elem = sel.node = data.ns ? document.createElementNS(data.ns, match[1])
                    : document.createElement(match[1]);
                if(match[2]){
                    elem.setAttribute("id", match[2]);
                }
                if(match[3]){
                    elem.setAttribute("class", match[3].split(".").join(" "));
                }

                this.updateAttrs(null, sel);
                this.updateProps(null, sel);
                this.updateStyle(null, sel);
                this.updateDataset(null, sel);
                this.updateClasses(null, sel);
                this.updateEvents(null, sel);

                $elem = $(elem).data("_sel", sel);

                if(children.length){
                    $.each(children, function(i, child){
                        $elem.append(that.createElemBySel(child, mountedQueue));
                    });
                }else{
                    $elem.html(sel.text);
                }

                if(hooks){
                    if(hooks.created){
                        hooks.created.call(sel.widget || sel.fragment, sel);
                    }
                    if(hooks.mounted){
                        mountedQueue && mountedQueue.push(sel);
                    }
                }
            }

            return sel.node;
        },

        triggerDestroyHook(sel) {
            var that = this;
            var hooks = sel.data.hooks;

            if(hooks && hooks.destroy){
                hooks.destroy.call(sel.widget || sel.fragment, sel);
            }

            this.destroyClasses(sel);
            this.destroyEvents(sel);

            $.each(sel.children, function(i, child){
                that.triggerDestroyHook(child);
            });
        },

        removeSels(sels, startIdx, endIdx) {
            var sel, rm, hooks;
            for (; startIdx <= endIdx; ++startIdx) {
                sel = sels[startIdx];
                if(sel){
                    this.triggerDestroyHook(sel);
                    rm = (function(node, count){
                        return function(){
                            if(--count < 1){
                                $(node).remove();
                            }
                        };
                    })(sel.node, 2);
                    this.removeClasses(sel, rm);
                    hooks = sel.data.hooks;
                    if(hooks && hooks.remove){
                        hooks.remove.call(sel.widget || sel.fragment, sel, rm);
                    }else{
                        rm();
                    }
                }
            }
        },

        createKeyToIdx: function(sels, startIdx, endIdx) {
            var i, map = {}, sel, key;
            for (i = startIdx; i <= endIdx; ++i) {
                sel = sels[i];
                if(sel && (key = sel.key)){
                    map[key] = i;
                }
            }
            return map;
        },

        addSels: function(parentElem, afterElem, sels, startIdx, endIdx, mountedQueue) {
            var sel;
            for (; startIdx <= endIdx; ++startIdx) {
                sel = sels[startIdx];
                if (sel) {
                    this.createElemBySel(sel, mountedQueue);
                    afterElem ? $(sel.node).insertBefore(afterElem) : $(sel.node).appendTo(parentElem);
                }
            }
        },

        updateChildren(parentElem, oldC, newC, mountedQueue) {
            var oldStartIdx = 0, newStartIdx = 0;
            var oldEndIdx = oldC.length - 1;
            var oldStartSel = oldC[0];
            var oldEndSel = oldC[oldEndIdx];
            var newEndIdx = newC.length - 1;
            var newStartSel = newC[0];
            var newEndSel = newC[newEndIdx];
            var oldKeyToIdx;
            var oldIdx;
            var elemToMove;
            var afterElem;
            while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
                if (oldStartSel == null) {
                    oldStartSel = oldC[++oldStartIdx];
                }
                else if (oldEndSel == null) {
                    oldEndSel = oldC[--oldEndIdx];
                }
                else if (newStartSel == null) {
                    newStartSel = newC[++newStartIdx];
                }
                else if (newEndSel == null) {
                    newEndSel = newC[--newEndIdx];
                }
                else if (this.sameSel(oldStartSel, newStartSel)) {
                    this.patchSel(oldStartSel, newStartSel, mountedQueue);
                    oldStartSel = oldC[++oldStartIdx];
                    newStartSel = newC[++newStartIdx];
                }
                else if (this.sameSel(oldEndSel, newEndSel)) {
                    this.patchSel(oldEndSel, newEndSel, mountedQueue);
                    oldEndSel = oldC[--oldEndIdx];
                    newEndSel = newC[--newEndIdx];
                }
                else if (this.sameSel(oldStartSel, newEndSel)) {
                    this.patchSel(oldStartSel, newEndSel, mountedQueue);
                    $(oldStartSel.node).insertAfter(oldEndSel.node);
                    oldStartSel = oldC[++oldStartIdx];
                    newEndSel = newC[--newEndIdx];
                }
                else if (this.sameSel(oldEndSel, newStartSel)) {
                    this.patchSel(oldEndSel, newStartSel, mountedQueue);
                    $(oldEndSel.node).insertBefore(oldStartSel.node);
                    oldEndSel = oldC[--oldEndIdx];
                    newStartSel = newC[++newStartIdx];
                }
                else {
                    oldKeyToIdx = oldKeyToIdx || this.createKeyToIdx(oldC, oldStartIdx, oldEndIdx);
                    if(newStartSel.key
                        && (oldIdx = oldKeyToIdx[newStartSel.key])
                        && (elemToMove = oldC[oldIdx])
                        && (elemToMove.sel === newStartSel.sel)
                    ){
                        this.patchSel(elemToMove, newStartSel, mountedQueue);
                        oldC[oldIdx] = null;
                        $(elemToMove.node).insertBefore(oldStartSel.node);
                    }else{
                        $(this.createElemBySel(newStartSel, mountedQueue)).insertBefore(oldStartSel.node);
                    }
                    newStartSel = newC[++newStartIdx];
                }
            }
            if (oldStartIdx <= oldEndIdx || newStartIdx <= newEndIdx) {
                if (oldStartIdx > oldEndIdx) {
                    afterElem = newC[newEndIdx + 1] == null ? null : newC[newEndIdx + 1].node;
                    this.addSels(parentElem, afterElem, newC, newStartIdx, newEndIdx, mountedQueue);
                }
                else {
                    this.removeSels(oldC, oldStartIdx, oldEndIdx);
                }
            }
        },

        cloneHook: function(hook, sel, oldSel){
            var fn = oldSel.data.hooks && oldSel.data.hooks[hook];
            if(fn){
                fn.call(sel.widget || sel.fragment, sel, oldSel);
                if(fn.keep){
                    sel.data.hooks = sel.data.hooks || {};
                    sel.data.hooks[hook] = fn;
                }
            }
        },

        patchSel: function(oldSel, sel, mountedQueue, root) {
            var hooks = sel.data.hooks;
            var node, element, oldChildren, children;

            if(hooks && hooks.beforepatch){
                hooks.beforepatch.call(sel.widget || sel.fragment, sel, oldSel);
                hooks = sel.data.hooks;
            }

            node = sel.node = oldSel.node;
            element = $(node);

            if(!root){
                element.data("_sel", sel);
            }

            if(hooks && hooks.beforeupdate){
                hooks.beforeupdate.call(sel.widget || sel.fragment, sel, oldSel);
            }
            this.cloneHook("_beforeupdate", sel, oldSel);

            if(sel.data.remove){
                return this.removeSels([sel], 0, 0);
            }

            this.updateAttrs(oldSel, sel);
            this.updateProps(oldSel, sel);
            this.updateStyle(oldSel, sel);
            this.updateDataset(oldSel, sel);
            this.updateClasses(oldSel, sel);
            this.updateEvents(oldSel, sel);

            if(hooks && hooks.updated){
                hooks.updated.call(sel.widget || sel.fragment, sel, oldSel);
            }
            this.cloneHook("_updated", sel, oldSel);

            oldChildren = oldSel.children;
            children = sel.children;

            if(oldChildren.length && children.length){
                this.updateChildren(node, oldChildren, children, mountedQueue);
            }
            else if(children.length){
                if(oldSel.text){
                    element.html("");
                }
                this.addSels(node, null, children, 0, children.length - 1, mountedQueue);
            }
            else if(oldChildren.length){
                this.removeSels(oldChildren, 0, oldChildren.length - 1);
                element.html(sel.text);
            }else{
                if(oldSel.text !== sel.text){
                    element.html(sel.text);
                }
            }

            if (hooks && hooks.patched) {
                hooks.patched.call(sel.widget || sel.fragment, sel, oldSel);
            }
            this.cloneHook("_patched", sel, oldSel);
        },

        patch: function(oldSel, sel) {
            var mountedQueue = [];

            if(!oldSel && !sel){
                return;
            }

            if(!oldSel){
                this.createElemBySel(sel);
            }
            else if(!sel){
                if(!oldSel.isSel){
                    oldSel = this.createSelByNode(oldSel);
                }
                this.removeSels([oldSel], 0, 0);
            }
            else{
                if(!oldSel.isSel){
                    oldSel = this.createSelByNode(oldSel, sel);
                }

                this.patchSel(oldSel, sel, mountedQueue, true);

                $.each(mountedQueue, function(i, sel){
                    sel.data.hooks.mounted.call(sel.widget || sel.fragment, sel);
                });
            }

            return sel;
        }
    };

    var dom = new Dom();

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


    $.widget("core.render", {

        options: {
            render: null,
            data: {},
            widget: null
        },

        _create: function () {

            var hook;
            var that = this;

            this.render = this.options.render;
            this.renderData = this.options.data;
            this.renderWidget = this.options.widget;
            this.dom = dom;
            this.instModel = new Model(this);
            this.instValidate = new Validate(this);

            //--

            this._createSel();
            this._checkElement();
            this._patch();

            if(
                this.sel &&
                (hook = this.sel.data.hooks) &&
                (hook = hook.mounted)
            ){
                hook.call(this.renderWidget || this, this.sel);
            }

            //--

            if(!$.isEmptyObject(this.instModel.map)){
                this.instModel.init();
            }

            //--

            $.each(this._createHooks, function (key, fn) {
                fn.call(that);
            });
        },

        _createSel: function () {
            var result = this.render(this.renderData, this.renderWidget);
            var sel = new Sel(result, this);
            this.sel = !sel.remove ? sel : null;
        },

        _checkElement: function(update){
            var match, pSel;

            if(this.sel){

                match = selReg.exec(this.sel.sel);

                if(!this.element.is(match[1])){
                    $.error("Original tag is different from the replace tag '" + match[1] + "'.");
                }

                if(update){
                    if(pSel = this.element.data("_sel")){
                        this._mergeSel(this.sel, pSel, update);
                    }
                }
                else{
                    if(pSel = this.element.data("_sel")){
                        return this._mergeSel(this.sel, pSel);
                    }
                    else{
                        this.element.attr({
                            id: match[2],
                            class: match[3] && match[3].split(".").join(" ")
                        });
                    }
                }
            }
        },

        _mergeSel: function(target, copy, update){

            var mt = selReg.exec(target.sel);
            var mc = selReg.exec(copy.sel);
            var id = mt[2] || mc[2];
            var classes;

            if(mc[3]){
                classes = mc[3].split(".");
            }

            if(mt[3]){
                classes = (classes || []).concat(mt[3].split("."));
            }

            target.sel = mt[1];

            if(id){
                target.sel += "#" + id;
                this.element[0]["id"] = id;
            }

            if(classes){
                classes = this._unique(classes);
                target.sel += "." + classes.join(".");
                this.element[0]["className"] = classes.join(" ");
            }

            target.data.style = $.extend({}, copy.data.style, target.data.style);
            target.data.classes = $.extend({}, copy.data.classes, target.data.classes);
        },

        _unique: function(arr){
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

        _patch: function () {
            this.dom.patch(this.oldSel || this.element[0], this.sel);
            this.oldSel = this.sel;
        },

        validate: function(name){
            if(name){
                return this.instValidate.validate(name);
            }
            return this.instValidate.validate();
        },

        rule: function(key, value){

            if(typeof key === "string"){
                key = {[key]: value};
            }

            $.extend(Validate.prototype.rules, key);
        },

        model: function(name, hasSel){
            
            var ret, result;
            
            if(typeof name === "boolean"){
                hasSel = name;
                name = undefined;
            }
            
            if(name){
                ret = this.instModel.get(name);
                return hasSel ? ret : ret.value;
            }
            else{
                ret = this.instModel.get();
                if(hasSel){
                    return ret;
                }
                else{
                    result = {};
                    $.each(ret, function (name, item) {
                        result[name] = item.value;
                    });
                    return result;
                }
            }
        },

        data: function(){
            return this.renderData;
        },

        update: function (data) {
            var that = this;

            if($.isFunction(data)){
                data(this.renderData);
            }
            else if(data){
                this.renderData = $.widget.extend(this.renderData, data);
            }

            clearTimeout(this.timeout);

            this.timeout = this._delay(function () {
                this._createSel();
                this._checkElement(true);
                this._patch();
            });

            //--

            $.each(this._updateHooks, function (key, fn) {
                fn.call(that);
            });
        },

        _destroy: function(){
            var that = this;
            $.each(this._destroyHooks, function (key, fn) {
                fn.call(that);
            });
        },

        _createHooks: {},
        _updateHooks: {},
        _destroyHooks: {}
    });



    $.fn.render = function(data, render, factory){

        return this.each(function (i, elem) {
            $.render(elem, data, render, factory);
        });
    };

    $.render = function(elem, data, render, factory){

        if($.isFunction(data)){
            factory = render;
            render = data;
            data = undefined;
        }

        return new Render(elem, {
            data: data,
            render: render,
            factory: factory
        });
    };


    ////----


    var renderUuid = 0;

    var Render = function (node, options) {

        this.node = node;
        this.sign = "_render_";
        this.uuid = renderUuid++;
        this.eventNamespace = "." + this.sign + this.uuid;

        $.data(this.node, this.sign, this);

        if($.isFunction(options)){
            this.render = options;
        }
        else{
            $.extend(this, options);
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
            var rawData = this.render(this.data, this.factory);
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
        }

    };


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
                                if(time < 1){
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


    ////----


    $.extend({

        slot: function(hook, sel){

            if($.isFunction(hook)){
                hook = hook.call(this.element, sel.node);
            }

            if(
                typeof hook === "string"
                || (hook != null && typeof hook === "object" && hook.nodeType)
            ){
                $(sel.node).append(hook);
            }
        },

        wdgt: function(name, options, sel){

            if(typeof name !== "string" || !$.fn[name]){
                $.error("Widget name does not exist.");
            }

            if(options && options.isSel){
                sel = options;
                options = undefined;
            }

            $(sel.node)[name](options);
        },

        hook: function (element, hook, fn, keep) {

            $(element).each(function (i, elem) {
                var sel = $(elem).data("_sel") || $(elem).data("ui-fragment").sel;

                sel.data.hooks = sel.data.hooks || {};
                sel.data.hooks["_" + hook] = function (sel, selOld) {
                    fn(sel, selOld, i, elem);
                };
                sel.data.hooks["_" + hook]["keep"] = keep;
            });
        }

    });

    ////----widget方法
    ////----_fragment
    ////----_wdgt,_slot,_hook

    $.extend($.Widget.prototype, {

        _fragment: function (element, render, data) {

            if(element.nodeType){
                element = $(element);
            }

            if(!element.jquery){
                return this._fragment(this.element, element, render, data);
            }

            if(typeof render === "string"){
                return element.fragment.apply(element, [].slice.call( arguments, 1 ))
            }
            else if(typeof render === "function"){

                try{
                    element.fragment("destroy");
                }
                catch (e) {

                }

                element.fragment({
                    render: render,
                    data: data || this.options,
                    widget: this
                });
            }
            else{
                $.error("The parameter 'render' of method '_fragment' is incorrect.");
            }
        },

        _slot: function(hook, sel){
            $.slot(hook, sel);
        },

        _wdgt: function (name, options, sel) {
            $.wdgt(name, options, sel);
        },

        _hook: function (element, hook, fn, keep) {

            if(typeof fn === "undefined" || typeof fn === "boolean"){
                fn = hook;
                hook = element;
                element = this.element;
            }

            $.hook(element, hook, fn, keep);
        }
    });

});