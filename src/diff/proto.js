import $ from "../jquery/index";
import Raw from "../raw/index";

const proto = {

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
                        events[name](e, handle.raw, handle.oldRaw);
                    }
                };
                handle.raw = raw;
                handle.oldRaw = oldRaw;
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

        if(!root || (root && !oldRaw.isSuperRaw)){
            if(data.hooks && data.hooks.update){
                data.hooks.update(raw, oldRaw);
            }
            this._hook("update", raw, oldRaw);
        }

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

    patch: function(oldRaw, raw, isWidgetRoot) {

        if(!oldRaw && !raw){
            return;
        }

        if(!oldRaw){
            raw.createQueue = [];
            this.createNodeByRaw(raw, raw.createQueue, isWidgetRoot);
        }
        else if(!raw){
            this.removeRaws([oldRaw], 0, 0);
        }
        else{
            raw.createQueue = [];
            this.patchRaw(oldRaw, raw, raw.createQueue, isWidgetRoot);

            $.each(raw.createQueue, function(i, raw){
                raw.data.hooks.create(raw);
            });
        }

        return raw;
    }
};

export default proto;