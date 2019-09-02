define(["jquery", "render"], function ($) {

    $("<div>").render(function(){
        return ["div.panel", [
            ["div.alert.alert-primary", "A simple primary alert—check it out!"],
            ["div.alert.alert-secondary", "A simple secondary alert—check it out!"],
            ["div.alert.alert-success", "A simple success alert—check it out!"],
            ["div.alert.alert-danger", "A simple danger alert—check it out!"],
            ["div.alert.alert-warning", "A simple warning alert—check it out!"],
            ["div.alert.alert-info", "A simple info alert—check it out!"],
            ["div.alert.alert-light", "A simple light alert—check it out!"],
            ["div.alert.alert-dark", "A simple dark alert—check it out!"]
        ]];
    }).prependTo("body");


});