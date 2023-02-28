class AcGameMenu {
    constructor(root) {
        this.root = root;
        this.$menu = $(`
<div class="ac-game-menu">
    <div class="ac-game-menu-field">
        <div class="ac-game-menu-field-item ac-game-menu-field-item-single-mode">
            单人模式
        </div>
        <br>
        <div class="ac-game-menu-field-item ac-game-menu-field-item-multi-mode">
            多人模式
        </div>
        <br>
        <div class="ac-game-menu-field-item ac-game-menu-field-item-settings">
            设置
        </div>
    </div>
</div>
`);
        this.root.$ac_game.append(this.$menu); //将当前menu加到主页面中
        this.$single_mode = this.$menu.find('.ac-game-menu-field-item-single-mode'); //single 按钮
        this.$multi_mode = this.$menu.find('.ac-game-menu-field-item-multi-mode');   //multi 按钮
        this.$settings = this.$menu.find('.ac-game-menu-field-item-settings');       //settings 按钮


        this.start();
    }

    start() {
        this.add_listening_events();
    }

    //绑定监听函数
    add_listening_events() {
        let outer = this;

        this.$single_mode.click(function(){
            outer.hide(); //关闭menu界面
            outer.root.playground.show(); //显示playground界面
        });

        this.$multi_mode.click(function(){
            console.log("click multi");
        });

        this.$settings.click(function(){
            console.log("click settings");
        });
    }

    show() {    //显示menu界面
        this.$menu.show();
    }

    hide() {    //关闭menu界面
        this.$menu.hide();
    }

}