define(["render"], function (render) {

    render.widget("collapse", {

        options: {
            accordion: true,
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
                    class: (i !== 0) && "m-hairline-top"
                }, [
                    ["div.m-collapse-item-title.m-cell.m-cell-clickable", {
                        tabindex: 0,
                        class: {
                            "m-collapse-item-title-expanded": o.accordion ? o.active === i : !!item.active,
                            "m-collapse-item-title-disabled": !!item.disabled
                        },
                        onclick: [w._click, item, i]
                    }, [
                        !!item.leftIcon && ["i.m-cell-left-icon", {class: item.leftIcon}],
                        ["div.m-cell-title", [
                            ["span", item.title]
                        ]],
                        ["i.m-cell-right-icon.m-icon.m-icon-arrow"]
                    ]],
                    ["div.m-collapse-item-wrapper", {
                        style: {
                            height: [w._height, item, i, o]
                        }
                    }, [
                        ["div.m-collapse-item-content", item.content]
                    ]]
                ]];
            }
        },

        _click: function (item, i, e) {
            if(item.disabled){
                return false;
            }
            this._update(
                function (o) {
                    if(o.accordion){
                        o.active = o.active === i ? -1 : i;
                    }
                    else{
                        item.active = !item.active;
                    }
                },
                function (o) {
                    if(o.onchange){
                        o.onchange(e, {
                            item: item,
                            index: i,
                            active: o.accordion ? o.active : item.active
                        });
                    }
                }
            );
        },

        _height: function (item, i, o, raw) {
            var element = render.$(raw.node);
            var children;
            if(
                (o.accordion && o.active !== i) ||
                (!o.accordion && !item.active)
            ){
                this._delay(function () {
                    element.css("display", "none");
                }, 300);
                return 0;
            }
            else{
                element.css("display", "");
                children = element.children();
                if(children.length){
                    return children.outerHeight(true);
                }
                else{
                    this._delay(function () {
                        element.css("height", element.children().outerHeight(true));
                    });
                    return undefined;
                }
            }
        }

    });

});