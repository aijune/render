import $ from "../jquery/index";
import Widget from "../widget/widget";
import {widget, widgets} from "../widget/index";

const render = function(element, widget, options){
    if(widget.renders){
        widget = render.widget("render" + $.widgetUuid++, widget);
    }
    new widget( element, options || {} );
};

render.jquery = $;
render.Widget = Widget;
render.widgets = widgets;
render.widget = widget;

export default render;