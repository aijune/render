define(["render", "w/m/cellgroup"], function (render) {

    render.widget("section", {

        options: {
            items: []
        },

        renders: {
            main: function (o, w) {
                return ["this.m-section", o.items.map(function (item, i) {
                    return ["div.m-section-block", [
                        ["div.m-section-block-title", item.title],
                        !!item.cellgroup && ["render[name=cellgroup]", item]
                    ]];
                })];
            },

            cellgroup: function (item, o, w) {
                return ["widget[name=cellgroup]", {
                    items: item.cellgroup
                }];
            }
        }
    });

});