define(["render", "async-validator"], function (render, Schema) {

    var $ = render.$;

    var Validator = function (widget, form, o) {

        var that = this;

        this.widget = widget;
        this.form = $(form);

        this.descriptor = o.descriptor;
        this.validFeedbacks = {};
        $.each(o.descriptor, function (key, val) {
            if(val.valid){
                that.validFeedbacks[key] = val.valid;
                delete val.valid;
            }
        });
        this.validator = new Schema(o.descriptor);

        if(o.trigger){
            this.trigger = o.trigger;
        }
        if(o.invalid){
            this.invalid = o.invalid;
        }
        if(o.valid){
            this.valid = o.valid;
        }

        this.trigger();
    };

    Validator.prototype = {

        constructor: Validator,

        trigger: function(){
            var that = this;
            this.widget._on(this.form, {
                "input input,textarea": handle,
                "propertychange input,textarea": handle,
                "change select": handle
            });

            function handle(e) {
                that.validate([$(e.currentTarget).prop("name")], function () {});
            }
        },

        validate: function (keys, options, callback) {
            var that = this;
            var data = this.form.serializeJson();
            var source = {};

            if(!options){
                callback = keys;
                options = undefined;
                keys = undefined;
            }
            else if(!callback){
                callback = options;
                options = undefined;
            }

            if(!keys){
                source = data;
            }
            else{
                $.each(keys, function (i, key) {
                    source[key] = data[key];
                });
            }

            this.validator.validate(source, options)
                .then(() => {
                    that.valid(source, that.validFeedbacks);
                    callback(source);
                })
                .catch((e) => {
                    that.invalid(e, source);
                    that.valid(source, that.validFeedbacks, e);
                });
        },

        invalid: function (e, source) {
            var that = this;
            var render = this.form.raw("render");

            $.each(e.errors, function (i, error) {
                var elem;

                if(!source.hasOwnProperty(error.field)){
                    return;
                }

                elem = that.form.find("[name=" + error.field + "]");

                render.hook(elem, "update", function (raw) {
                    $.widget.extend(raw.data, {
                        class: {
                            "is-invalid": {init: "add"}
                        }
                    });
                }, true);

                render.hook(elem.parent(), "update", function (raw) {
                    raw.children.push(new raw.constructor(["div.invalid-feedback", error.message], render, raw));
                }, true);
            });

            render.update();
        },

        valid: function (source, valid, e) {
            var that = this;
            var render = this.form.raw("render");

            $.each(source, function (key, val) {
                var elem;

                if(e && e.fields[key]){
                    return;
                }

                elem = that.form.find("[name=" + key + "]");

                render.hook(elem, "update", function (raw) {
                    $.widget.extend(raw.data, {
                        class: {
                            "is-valid": {init: "add"}
                        }
                    });
                }, true);

                render.hook(elem.parent(), "update", function (raw) {
                    if(valid[key]){
                        raw.children.push(new raw.constructor(["div.valid-feedback", valid[key]], render, raw));
                    }
                }, true);
            });

            render.update();
        }

    };

    if(render.Widget){

        $.extend(render.Widget.prototype, {
            _validate: function (form, options) {
                form = $(form);
                return new Validator(this, form[0], options);
            }
        });
    }

});