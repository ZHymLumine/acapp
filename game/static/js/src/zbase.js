class AcGame {
    constructor(id) {
        this.id = id;
        this.$ac_game = $('#' + id); //找到页面对象的id
        this.menu = new AcGameMenu(this);
        this.playground = new AcGamePlayground(this);

        this.start();
    }

    start() {
    }
}
