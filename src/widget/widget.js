import $ from "../jquery/index";
import Raw from "../raw/index";
import Diff from "../diff/index";

const Widget = function() {};
Widget._childConstructors = [];
Widget.prototype = {

    constructor: Widget,

    widgetName: "widget",

    defaultTag: "div",

    options: {
        slots: {}
    },

    renders: {},

    _diff: new Diff(),

    _createWidget: function (element, options) {
        this.node = $(element)[0];
        this.uuid = $.widgetUuid++;
        this.eventNamespace = "." + this.widgetName + this.uuid;
        this.bindings = $();

        $.data(this.node, "widgets-" + this.widgetName, this);
        this.options = $.widgetExtend({}, this.options, options);
        if($.isFunction(this.renders)){
            this.renders = {main: this.renders};
        }

        this._create();
    },

    _create: function () {
        var create, hooks;

        this._createRaw();
        this._mergeRaw();
        this._patch();

        if(this.raw){
            hooks = this.raw.data.hooks = this.raw.data.hooks || {};
            if (create = hooks.create) {
                create(this.raw);
            }
        }
    },

    _createRaw: function () {
        var that = this;
        var main = this.renders["main"];
        var vnode, hooks, destroy;

        if (!$.isFunction(main)) {
            $.error("render error: main");
        }

        vnode = main.call(this, this.options, this);
        vnode = $.createRenderRoot(vnode, true);

        this.raw = vnode == null ? null : new Raw(vnode, this);
        if(this.raw){
            hooks = this.raw.data.hooks = this.raw.data.hooks || {};
            destroy = hooks.destroy;
            hooks.destroy = function (raw, rm) {
                that._clearData();
                destroy ? destroy(raw, rm) : rm();
            };
        }
    },

    _mergeRaw: function () {
        var element = $(this.node);

        if (!this.superRaw) {
            this.superRaw = element.data("_raw_") || this._diff.createRawByNode(this.node, this);
            this.superRaw.isSuperRaw = true;
        }

        if (this.raw) {
            this.raw.tag = element.prop("tagName").toLowerCase();

            if (this.superRaw.data.style) {
                this.raw.data.style = $.widgetExtend({}, this.superRaw.data.style, this.raw.data.style);
            }
            if (this.superRaw.data.class) {
                this.raw.data.class = $.widgetExtend({}, this.superRaw.data.class, this.raw.data.class);
            }
            if (this.superRaw.data.attrs) {
                this.raw.data.attrs = $.widgetExtend({}, this.superRaw.data.attrs, this.raw.data.attrs);
            }
        }
    },

    _patch: function () {
        this._diff.patch(this.oldRaw || this.superRaw, this.raw, true);
        this.oldRaw = this.raw;
    },

    _class: function () {
        var raw = Raw.prototype;
        var result = {};
        var leng = arguments.length;
        var i = 0;
        for (; i < leng; i++) {
            $.extend(result, raw.formatClass(arguments[i]));
        }
        return result;
    },

    _render: function (render) {
        var args = widgetSlice.call(arguments, 1);
        var raw = Raw.prototype;
        var result = [];
        var vnode;

        render = this.renders[render];
        if (!$.isFunction(render)) {
            $.error("render error: " + render);
        }

        vnode = render.apply(this, args.concat([this.options, this]));
        vnode = raw.formatVnode(vnode);
        $.each(vnode, function (i, item) {
            result = result.concat(raw.formatWidgetChildren(item));
        });
        return result;
    },

    _delay: function (handler, delay) {
        function handlerProxy() {
            return (typeof handler === "string" ? instance[handler] : handler)
                .apply(instance, arguments);
        }

        var instance = this;
        return setTimeout(handlerProxy, delay || 0);
    },

    _update: function (value, callback) {
        var that = this;
        var delay;

        if ($.isFunction(value)) {
            value.call(that, this.options);
        } else {
            $.widgetExtend(this.options, value);
        }

        if (callback) {
            this.updateCallbacks = this.updateCallbacks || [];
            this.updateCallbacks.push(callback);
        }

        if (!this.updating) {
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

    _clearData: function(){
        $(this.node)
            .off(this.eventNamespace)
            .removeData(this.widgetName);

        this.bindings.off(this.eventNamespace);
    },

    _destroy: function () {
        this._clearData();
        $(this.node).remove();
    },

    _on: function (element, handlers) {
        var delegateElement;
        var instance = this;

        if (!handlers) {
            handlers = element;
            element = delegateElement = $(this.node);
        } else {
            element = delegateElement = $(element);
            this.bindings = this.bindings.add(element);
        }

        $.each(handlers, function (event, handler) {
            var args = [];

            if($.isArray(handler)){
                args = $.widgetSlice.call(handler, 1);
                handler = handler[0];
            }

            function handlerProxy(e) {
                var raw;

                args.push(e);
                if (raw = $(e.currentTarget).data("_raw_")) {
                    args.push(raw);
                }

                return handler.apply(instance, args);
            }

            if(!$.isFunction(handler)){
                return $.error("event error: " + handler);
            }

            handlerProxy.guid = handler.guid = handler.guid || $.guid++;

            var match = event.match(/^([\w:-]*)\s*(.*)$/);
            var eventName = match[1] + instance.eventNamespace;
            var selector = match[2];
            if (selector) {
                delegateElement.on(eventName, selector, handlerProxy);
            } else {
                element.on(eventName, handlerProxy);
            }
        });
    },

    _off: function (element, eventName) {
        eventName = (eventName || "").split(" ").join(this.eventNamespace + " ") +
            this.eventNamespace;
        $(element).off(eventName).off(eventName);

        this.bindings = $(this.bindings.not(element).get());
    },

    _trigger: function (type, event, data) {
        var prop, orig;
        var callback = this.options[type];

        data = data || {};
        event = $.Event(event);
        event.type = type.toLowerCase();
        event.target = this.node;

        orig = event.originalEvent;
        if (orig) {
            for (prop in orig) {
                if (!(prop in event)) {
                    event[prop] = orig[prop];
                }
            }
        }

        this.element.trigger(event, data);
        return !($.isFunction(callback) &&
            callback.apply(this.element[0], [event].concat(data)) === false ||
            event.isDefaultPrevented());
    }
};

export default Widget;