define(["render"], function (render) {

    var $ = render.$;

    return function (code, raw) {
        var elem = $("<div>").appendTo(raw.node);
        eval(code);

        $("<div><pre class='border mt-2'></pre></div>").appendTo(raw.node).find("pre").text(code);
    }
});
