import { GameObject } from "../gameObject";

export function Background(_root, container) {
    var offsetGroundWidth = 16*6;
    var e = new GameObject(_root, container).init();
	this._update = e.update;

    return Object.assign(e, this, {
        init: function() {
            // backgrounds
            this.scrollSpeedX = 10;
            this.bg0 = this.createSprite("bg_space");
            this.bg1 = this.createSprite("bg_space");
            this.bg2 = this.createSprite("bg_space");
            this.bgTrain = this.createSprite("bg_train");
            this.bgTrainShade1 = this.createSprite("bg_train_shade");
            this.bgTrainShade2 = this.createSprite("bg_train_shade");
            this.bg2.x = this.bg1.x + this.bg1.width;
            this.bgTrain.y = this._root.config.height - this.bgTrain.height;
            this.bgTrainShade1.y = this.bgTrainShade2.y = this.bgTrain.y - this.bgTrainShade1.height / 2 + 0.5;
            this.bgTrainShade2.x = this.bgTrainShade1.x + this.bgTrainShade1.width;
            // platforms
            this.ground = this.g.rectangle(this._root.config.width + offsetGroundWidth, this.bgTrain.height/2, "blue", "", 0, -offsetGroundWidth/2, 108);
            this.wall1 = this.g.rectangle(10, this._root.config.height, "black", "", 0, 0, 0);
            this.wall2 = this.g.rectangle(10, this._root.config.height, "black", "", 0, this._root.config.width - 10, 0);
            this.wall1.name = "wall1";
            this.wall2.name = "wall2";
            this.wall1.visible = false;
            this.wall2.visible = false;
            this.platforms = [this.ground, this.wall1, this.wall2];
            this.walls = [this.wall1, this.wall2];
            // group
            this.bgContainer = this.g.group(this.bg0, this.bg1, this.bg2, this.bgTrain, this.bgTrainShade1, this.bgTrainShade2, this.ground, this.wall1, this.wall2);
            this.container.addChild(this.bgContainer);
            // update fn
            this.addToHitAreaWatchList(this.platforms);
            this.startUpdate();
            return this;
        },

        update: function() {
            this._update();
            this.updateParallaxScene(this.bg1, this.bg2, this._root.config.width);
            this.updateParallaxScene(this.bgTrainShade1, this.bgTrainShade2, this._root.config.width, "_parallaxShadePos");
        },

        updateParallaxScene: function(bg1, bg2, maxWidth) {
            bg1.visible = true;
            bg2.visible = true;
            bg1.x -= this.scrollSpeedX;
            bg2.x -= this.scrollSpeedX;
            if (bg1.x <= -maxWidth) {
                bg1.visible = false;
                bg1.x = bg2.x + bg2.width;
            }
            if (bg2.x <= -maxWidth) {
                bg2.visible = false;
                bg2.x = bg1.x + bg1.width;
            }
        }
    });
}
