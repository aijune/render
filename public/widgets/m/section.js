define(["render", "w/m/cellgroup", "w/m/collapse"], function (render) {

    render.widget("section", {

        options: {
            items: []
        },

        renders: {
            main: function (o, w) {
                return ["this.m-section", o.items.map(function (item, i) {
                    return ["div.m-section-block", [
                        ["div.m-section-block-title", item.title],
                        ["widget[name=" + item.widget.name + "]", item.widget.options]
                    ]];
                })];
            }
        }
    });

});