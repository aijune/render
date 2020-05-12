define(["render", "w/alert"], function (render) {

    render("#layout", {

        renders: {
            main: function (o, w) {
                return ["widget[name=alert]", {type: "secondary"}, [
                    ["div", "<strong>Holy guacamole!</strong> You should check in on some of those fields below."]
                ]]
            }
        }

    });


});
