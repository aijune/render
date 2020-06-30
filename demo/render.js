import $ from 'jquery';
import render from '@/index';



// demo 6
// widget 事件
render('#app', {
    options: {
        text: 'click me',
        remove: false
    },
    renders: {
        main(o){
            return !o.remove && ['this', {
                oncreate(raw){
                    console.log(raw, 'widget is created');
                },
                onupdate(raw, oldRaw){
                    console.log(raw, oldRaw, 'widget will be update')
                },
                ondestroy(raw, rm){
                    console.log(raw, 'widget will be destory');
                    rm();
                },
                onclick(e, raw){
                    // this._update({text: 'click this'});
                    this._update({remove: true});
                }
            }, o.text]
        }
    }
});


/*
// demo 5
// 当返回值是 array
// 'this' 指代挂载元素
render('#app', {
    renders: {
        main(){
            // return ['this', 'hello world'];
            // return ['div', 'hello world'];

            /!*
            return ['this', [
                ['p', 'this is a p'],
                ['div', 'this is a div']
            ]];
            *!/

            /!*
            return ['this',
                ['p', 'this is a p'],
                ['div', 'this is a div']
            ];
            *!/

            /!*
            return [
                ['p', 'this is a p'],
                666,
                ['div', 'this is a div']
            ];
            *!/

            return [
                ['p', 'this is a p'],
                666,
                [
                    ['div', 'this is a div'],
                    '999',
                    ['p', 'this is an other p']
                ]
            ];
        }
    }
});
*/

/*
// demo 4
// 返回值是非array: string, number, function, object, 使用挂载元素包裹
render('#app', {
    renders: {
        main(){
            // return 'hello world';
            // return 666;
            // return function(){console.log(999);};
            return {a: 666, b: 999}
        }
    }
});
*/

/*
// demo 3
// 返回值是undefined, null, boolean, 移除 #app 挂载元素
render('#app', {
    renders: {
        main(){
            // return;
            // return undefined;
            // return null;
            // return false;
            return true;
        }
    }
});
*/

/*
// demo 2
// renders是object, 默认运行main方法
render('#app', {
    renders: {
        main(){
            return ['this', 'this renders is an object.']
        }
    }
});
*/

/*
// demo 1
// renders是function
render('#app', {
    renders(){
        return ['this', 'this renders is a function.']
    }
});
*/
