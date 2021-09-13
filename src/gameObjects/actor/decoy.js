import { Actor } from "./actor";

export function Decoy(_root, container, settings) {
    var a = new Actor(_root, container).init();

    return Object.assign(a, this, {
        init: function() {
            this.isRun = false;
            this.speedX = 2;
            this.isDestroy = false;
            this.runDuration = settings.runDuration;
            this.spawnDuration = settings.spawnDuration;
            this.lifeSpanDuration = 200;
            this.punchInterval = 10;
            this.idleInterval = 20;
            this.runTicker = new this.g.Ticker();
            this.punchTicker = new this.g.Ticker();
            this.lifeSpanTicker = new this.g.Ticker();
            this.spawn(settings);
            return this;
        },

        spawn: function(settings) {
			if (this._root.isGameOver) { return; }
            setTimeout(function() {
                this.create(settings.sprite, { height: 16, x: settings.x, y: settings.y, flipH: settings.flipH});
                this.setAnimatonStates({
                    idle: { frames: this.getFrames(this.skin, settings.sprite + "idle_"), fps: 8, loop: true },
                    run: { frames: this.getFrames(this.skin, settings.sprite + "run_"), fps: 8, loop: true },
                    jump: { frames: this.getFrames(this.skin, settings.sprite + "jump"), fps: 8, loop: false },
                    punch: { frames: this.getFrames(this.skin, settings.sprite + "punch"), fps: 8, loop: false },
                });
                this._root.sound.play("fxSpawnD");
                this.startUpdate();
            }.bind(this), this.spawnDuration);
        },

        onUpdate: function() {
            if (!this.isDead) {
                this.updateMovement();
            }
            this.updateToGravity();
            this.vsPlatforms(this._root.background.platforms);
            this.vsWalls();
            this.updateSkinToBody();
            this.updateAttackHitAreaToBody();
        },

        updateMovement: function() {
            this.updateOnGroundBehaviour();
            if (this.vy > 0) {
                this.isFalling = true;
                this.playAnimation(this.skin, "jump");
            }
            this.updateBodyVelocityX();
            if (this.runTicker.tick && this.runTicker.tick % this.runDuration === 0 && !this.runTicker.isStop) {
                this.runTicker.stop();
                this.isRun = false;
            }
        },

        updateOnGroundBehaviour: function() {
            if (this.isOnGround) {
                this.updateOnGroundCommonProps();
                if (!this.runTicker.tick) {
                    this.isRun = true;
                }
                this.runTicker.run();
                if (this.isRun) {
                    this.isAttack = false;
                    this.playAnimation(this.skin, "run");
                    this.vx = this.flipH * this.speedX;
                } else {
                    this.vx = 0;
                    if (!this.punchTicker.tick) {
                        this.playAnimation(this.skin, "idle");
                    }
                    this.punchTicker.run();
                    this.lifeSpanTicker.run();
                    if (this.punchTicker.tick && this.punchTicker.tick % this.punchInterval === 0) {
                        this.playAnimation(this.skin, "punch");
                        this.isAttack = true;
                    }
                    if (this.punchTicker.tick && this.punchTicker.tick % this.idleInterval === 0) {
                        this.playAnimation(this.skin, "idle");
                        this.isAttack = false;
                    }
                    if (this.lifeSpanTicker.tick && this.lifeSpanTicker.tick % this.lifeSpanDuration === 0) {
                        this.isAttack = false;
                        this.lifeSpanTicker.stop();
                        this.destroy();
                    }
                }
            }
        },

        destroy: function() {
            this.stopUpdate();
            this.showSkinBody(false);
			this.removeSkinBody(true);
            this.isDestroy = true;
        }

    });

}
