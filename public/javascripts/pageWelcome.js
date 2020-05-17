define(["render", "w/page"], function (render) {

    return render.widget("pageWelcome", {

        renders: {
            main: function (o, w) {
                return ["widget[name=page]", [
                    ["slot[name=title]", "Welcome"],
                    ["slot[name=content]", [
                        ["div.jumbotron", [
                            ["h.display-4", "Hello, world!"],
                            ["p.lead", "This is a simple hero unit, a simple jumbotron-style component for calling extra attention to featured content or information."],
                            ["hr.my-4"],
                            ["p", "It uses utility classes for typography and spacing to space content out within the larger container."],
                            ["a.btn.btn-primary.btn-lg", {href: "#"}, "Learn more"]
                        ]]
                    ]]
                ]];
            }
        },

        _init: function () {
            this._render();
        }
    });
});
