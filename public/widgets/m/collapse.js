define(["render"], function (render) {

    render.widget("collapse", {

        options: {
            active: 0,
            items: []
        },

        renders: {
            main: function (o, w) {
                return ["this.m-collapse.m-hairline-top-bottom", [
                    ["render[name=item]", o.items]
                ]];
            },
            item: function (item, i, o, w) {
                return ["div.m-collapse-item", {
                    class: (i !== 0) && "van-hairline-top",
                    onclick: [w._click, item, i]
                }, [
                    ["div.m-collapse-item-title.m-cell.m-cell-clickable", {
                        tabindex: 0,
                        class: {
                            "m-collapse-item-title-expanded": o.active === i
                        }
                    }, [
                        ["div.m-cell-title", [
                            ["span", item.title]
                        ]],
                        ["i.m-cell-right-icon.m-icon.m-icon-arrow"]
                    ]],
                    ["div.m-collapse-item-wrapper", {
                        style: {
                            height: [w._height, i, o]
                        }
                    }, [
                        ["div.m-collapse-item-content", item.content]
                    ]]
                ]];
            }
        },

        _click: function (item, i) {
            this._update(function (o) {
                o.active = o.active === i ? -1 : i;
            });
        },

        _height: function (i, o, raw) {
            var element = render.$(raw.node);
            if(o.active !== i){
                this._delay(function () {
                    element.css("display", "none");
                }, 300);
                return 0;
            }
            else{
                return element
                    .css("display", "")
                    .children().outerHeight(true);
            }
        }
    });

});