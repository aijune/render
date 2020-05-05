define(["render"], function (render) {

    render.widget("cellgroup", {

        options: {
            items: []
        },

        renders: {
            main: function (o, w) {
                return ["div.m-cell-group.m-hairline-top-bottom", o.items.map(function (item, i) {
                    return ["div.m-cell", {
                        class: (item.rightIcon === true) && "m-cell-clickable",
                        onclick: [w._click, item, i]
                    }, [
                        !!item.leftIcon && ["i.m-cell-left-icon", {class: item.leftIcon}],
                        ["div.m-cell-title", [
                            ["span", item.title],
                            !!item.label && ["div.m-cell-label", item.label]
                        ]],
                        ["div.m-cell-value", item.value],
                        !!item.rightIcon && ["i.m-cell-right-icon", {class: item.rightIcon === true ? "m-icon m-icon-arrow" : item.rightIcon}],
                    ]];
                })];
            }
        },

        _click: function (item, i, e, raw) {
            if(item.onclick){
                item.onclick(e, {item: item, index: i})
            }
        }
    });
});