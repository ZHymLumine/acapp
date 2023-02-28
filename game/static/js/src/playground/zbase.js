class AcGamePlayground {
    constructor(root) {
        this.root = root;
        this.$playground = $(`<div>游戏界面</div>`);

        this.hide();
        this.root.$ac_game.append(this.$playground);

        this.start();
    }

    start() { //显示playground界面
    }

    show() {    //关闭playground界面
        this.$playground.show();
    }

    hide() {
        this.$playground.hide();
    }
}
