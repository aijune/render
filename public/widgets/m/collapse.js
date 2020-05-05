define(["render", "bootstrap"], function (render) {

    render.widget("collapse", {

        options: {
            items: []
        },

        renders: {
            main: function (o, w) {
                return ["this.mb-collapse", [
                    ["render[name=item]", o.items]
                ]];
            },
            item: function (item, i, o, w) {
                var id = "#id" + $.now() + i;
                return ["div.mb-collapse-item", [
                    ["div.mb-collapse-item-title-wrap.collapsed", {
                        "data-toggle": "collapse",
                        "data-target": id
                    }, [
                        ["div.mb-collapse-item-title", [
                            ["span", item.title]
                        ]],
                        ["i.mb-collapse-item-right-icon" + (item.icon || ".glyphicon.glyphicon-menu-down")]
                    ]],
                    ["div.collapse" + id, [
                        ["div.mb-collapse-item-content", {ref: "content" + i}]
                    ]]
                ]];
            }
        },

        _create: function(){

        },

        _init: function () {
            this._render("main");

            this._content();
        },

        _content: function () {
            var that = this;
            $.each(this.options.items, function (i, item) {
                var elem = that.refs["content" + i];
                if($.isFunction(item.content)){
                    item.content.call(that.element, elem);
                }
                else{
                    elem.html(item.content);
                }
            });
        }
    });

});