import render from '@/index';



// demo 3
render('#app', {
    renders: {
        main(o){
            return ['this', [
                ['input.class1[disabled][data-title = this is a title][data-value = ""]#id.class2'],
                ['#id2.class1.class2[style = font-size: 22px; font-weight: bold; ]', 'this is a div']
            ], 'sel test'];
        }
    }
});


/*
// demo 2
render('#app', {
    renders: {
        main(o){
            return ['this', [
                ['input[type=\'text\'][value=\'value\'][data-value=\'\'\"\[\\\]\"\'\'][disabled]'],
                ["input[type=\"text\"][value=\"value\"][data-value=\"\'\"\[\\\]\"\'\"][disabled]"],
                ['input[type=\'text\'][value=\'value\'][data-value=\'\\\'\\\\\'][disabled]'],
                ["input[type=\"text\"][value=\"value\"][data-value=\"\\\"\\\\\"][disabled]"],
            ], 'sel test'];
        }
    }
});
*/

/*
// demo 1
render('#app', {
    renders: {
        main(o){
            return ['this', [
                ['div'],
                ['div#id1'],
                ['div#id2.class1.class2.class3'],
                ['div.class1.class2#id3.class3'],
                ['div#id4.class4[style=font-size:22px;font-weight:bold;]', 'div font test'],
                ['div#id5.class4[style="font-size:22px;font-weight:bold;"][data-title="this is a title"]', 'this is a title']
            ], 'sel test'];
        }
    }
});
*/
