import $ from "../jquery/index"
import Sel from "../sel/index";
import proto from "./proto";

const Raw = function (vnode, widget, parent, node) {
    var sel, DCT;

    this.widget = widget;
    this.parent = parent;
    this.render = parent ? parent.render : widget.renders.main;
    this.args = parent ? parent.args : [widget.options, widget];
    this.node = node;
    this.selector = vnode[0];

    sel = Sel.compile(this.selector);
    this.tag = sel.tag;

    if(this.tag === "render"){
        return this.setRender(sel.data.name, vnode[1]);
    }

    if(this.tag === "slot"){
        return this.setSlot(sel.data.name, vnode[1]);
    }

    DCT = this.getDCT(vnode.slice(1));
    DCT.data = $.widgetExtend({}, this.transClassStyle(sel.data), this.transClassStyle(DCT.data));

    if(this.tag === "widget"){
        return this.setWidget(DCT);
    }

    this.setData(DCT.data);
    this.setChildren(DCT.children);
    this.text = DCT.text;

    //svg

    if(/^svg/.test(this.selector)) {
        this.addNS(this.data, this.children);
    }
};

Raw.prototype = {
    constructor: Raw,
    ...proto
}

export default Raw;