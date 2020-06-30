const Sel = {

    parser: /(?:(^|#|\.)([^#\.\[\]]+))|(\[(.+?)(?:\s*=\s*("|'|)((?:\\["'\]]|.)*?)\5)?\])/g,

    cache: {},

    compile: function(selector) {
        var match, tag = "div", classes = [], data = {};

        if(selector && (match = this.cache[selector])){
            return match;
        }

        while (match = this.parser.exec(selector)){
            var attrValue;
            var type = match[1], value = match[2];
            if (type === "" && value !== "") {
                tag = value;
            }
            else if (type === "#") data.id = value;
            else if (type === ".") classes.push(value);
            else if (match[3][0] === "[") {
                attrValue = match[6];
                if (attrValue) attrValue = attrValue.replace(/\\(["'])/g, "$1").replace(/\\\\/g, "\\");
                if (match[4] === "class") classes.push(attrValue);
                else data[match[4]] = attrValue === "" ? attrValue : attrValue || true;
            }
        }

        if (classes.length > 0) data.class = classes;
        return this.cache[selector] = {tag: tag, data: data};
    }
};

export default Sel;