requirejs = {
    baseUrl: "/javascripts",
    urlArgs: "v=20020202",
    paths: {
        jquery: "../librarys/jquery/jquery",
        render: "../librarys/render/render",
        bootstrap: "../librarys/bootstrap/bootstrap",
        extend: "../librarys/jquery/jquery.extend",
        popper: "../librarys/popper/popper",
        w: "../widgets",
        router: "../librarys/router/router",
        "async-validator": "../librarys/validator/async-validator",
        validator: "../librarys/validator/validator"
    },
    shim: {
        //bootstrap: ["popper"]
    }
};
