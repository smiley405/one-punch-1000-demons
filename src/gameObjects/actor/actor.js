import { BEHAVIOUR_STATES, FLIP_H_SIDE } from "../../const";
import { GameObject } from "../../gameObject";

export function Actor(_root, container) {
    var DEFAULT_GRAVITY = 0.9;
    var e = new GameObject(_root, container).init();
	this._update = e.update;

    return Object.assign(e, this, {
        init: function() {
            this.skin = null;
            this.body = null;
            this.attackHitArea = null;
            this.health = 10;
            this.damage = 1;
            this.speedX = 3;
            this.speedY = 1;
            this.vx = this.speedX;
            this.vy = 0;
            this.ax = 0;
            this.ay = 0;
            this.gravity = DEFAULT_GRAVITY;
            this.jumpForce = 8;
            this.isOnGround = false;
            this.isFalling = false;
            this.isJumping = false;
            this.isAttack = false;
            this.isTakeDamage = false;
            this.isPowerAttack = false;
            this.isPowerAttackUsed = false;
            this.isAllowAttack = true;
            this.timeouts.allowAttack = null;
            this.flipH = FLIP_H_SIDE.RIGHT.value;
            this.isDead = false;
            this.ignoreWallNameForCollision = "";
            this.activeBehaviourState = BEHAVIOUR_STATES.NONE;
            return this;
        },

        /**
         * 
         * @param {string} spriteName 
         * @param {ga.rectangle} options - optional, ga.rectangle( ...param ) plus, {flipH}
         */
        create: function(spriteName, options) {
            if (!this.skin) {
                options = options || {};
                this.skin = this.createSprite(spriteName);
                this.skin.onAnimationComplete = this.onSkinAnimationComplete.bind(this);

                var width = options.width || this.skin.halfWidth;
                var height = options.height || this.skin.height;
                this.body = this.g.rectangle(width, height, options.fillStyle, options.strokeStyle, options.lineWidth, options.x, options.y);
                this.body.visible = false;
                this.container.addChild(this.skin);
                this.container.addChild(this.body);
                this.addToHitAreaWatchList([this.body]);
                this.updateSkinToBody();
                if (options.flipH) {
                    this.flip(options.flipH);
                }
            }
        },

        /**
         * 
         * @param {ga.rectangle} options 
         */
        createAttackHitArea: function(options) {
            options = options || {};
            var width = options.width || this.body.width;
            var height = options.height || this.body.halfHeight;
            this.attackHitArea = this.g.rectangle(width, height, options.fillStyle, options.strokeStyle, options.lineWidth, options.x, options.y);
            this.container.addChild(this.attackHitArea);
            this.addToHitAreaWatchList([this.attackHitArea]);
            this.updateAttackHitAreaToBody();
        },

        isFlipH: function() {
            return Boolean(this.flipH === FLIP_H_SIDE.LEFT.value);
        },

        /**
         * 
         * @param {string|number} side - ["right" or "left"] or [1 or -1]
         */
        flip: function(side) {
            side = isNaN(side) ? side : this.getFlipHSide(side); 
            switch(side) {
                case FLIP_H_SIDE.RIGHT.side:
                    this.flipH = FLIP_H_SIDE.RIGHT.value;
                    if ( this.skin.scaleX < 0 ) {
                        this.skin.scaleX *= -1;
                    }
                    break;
                case FLIP_H_SIDE.LEFT.side:
                    this.flipH = FLIP_H_SIDE.LEFT.value;
                    if ( this.skin.scaleX > 0 ) {
                        this.skin.scaleX *= -1;
                    }
                    break;
            }
        },

        getFlipHSide: function(sideByNumber) {
            return (sideByNumber === FLIP_H_SIDE.LEFT.value ? FLIP_H_SIDE.LEFT.side : FLIP_H_SIDE.RIGHT.side);
        },

        updateToGravity: function() {
            this.vy += this.ay;
            this.vy += this.gravity;
            this.body.y += this.vy;
        },

        updateBodyVelocityX: function() {
            this.vx += this.ax;
            this.body.x += this.vx;
        },

        updateOnGroundCommonProps: function() {
            this.gravity = DEFAULT_GRAVITY;
            this.isJumping = false;
            this.isFalling = false;
        },

        vsPlatforms: function(platforms) {
            for (var i = 0; i < platforms.length; i++) {
                var platform = platforms[i];
                var testResult = this.g.hitTest({
                    target: platform,
                    source: this.body
                });
                if (testResult.hit) {
                    if (testResult.side === "bottom" && this.vy >= 0) {
                        this.isOnGround = true;
                        this.isFalling = false;
                        this.isJumping = false;
                        this.body.y = platform.y - this.body.height;
                        this.vy = -this.gravity;
                    } else if (testResult.side === "top" && this.vy <= 0) {
                        this.vy = 0;
                    } else if (testResult.side === "right" && this.vx >= 0) {
                        this.x = platform.x - this.width;
                        this.vx = 0;
                    } else if (testResult.side === "left" && this.vx <= 0) {
                        this.x = platform.x + platform.width;
                        this.vx = 0;
                    }
                    if (testResult.side !== "bottom" && this.vy > 0) {
                        this.isOnGround = false;
                    }
                }
            }
        },

        vsWalls: function() {
            for (var i = 0; i < this._root.background.walls.length; i++) {
                var wall = this._root.background.walls[i];
                if (this.ignoreWallNameForCollision === wall.name) { return; }
                var testResult = this.g.hitTest({
                    target: wall,
                    source: this.body
                });
                if (testResult.hit) {
                    if (testResult.side === "right" && this.vx >= 0) {
                        this.flip(FLIP_H_SIDE.LEFT.side);
                    } else if (testResult.side === "left" && this.vx <= 0) {
                        this.flip(FLIP_H_SIDE.RIGHT.side);
                    }
                }
            }
        },

        attack: function(attackAnimationName) {
            if (this.isOnGround) {
                this.playAnimation(this.skin, attackAnimationName);
                this.isAttack = true;
                this.isAllowAttack = false;
                this.killTimeout("allowAttack");
            }
        },

        getReversedFlipH: function(flipH) {
            flipH = flipH || this.flipH;
            return flipH === FLIP_H_SIDE.RIGHT.value ? FLIP_H_SIDE.LEFT.value : FLIP_H_SIDE.RIGHT.value;
        },

        forceJump: function(force, animation) {
            var upForce = force || this.jumpForce;
            animation = animation || "jump";
            this.vy = -upForce;
            this.isOnGround = false;
            this.isJumping = true;
            this.playAnimation(this.skin, animation);
        },

        receiveDamage: function(amount, dieFlipHSide, jumpForce) {
            jumpForce = jumpForce || 3;
            this.health -= amount;
            this.isTakeDamage = true;
            this.forceJump(jumpForce, "hurt");
            if( this.health <= 0 ) {
                this.kill( dieFlipHSide );
            } else {
                this.playAnimation(this.skin, "hurt");
            }
        },

        showSkinBody: function(visible) {
            this.skin.visible = visible;
            this.body.visible = visible;
        },

        removeSkinBody: function() {
            this.skin.parent.removeChild(this.skin);
            this.body.parent.removeChild(this.body);
        },

        forceMoveTo: function(forceFlipHSide, distance) {
            this.body.x = distance;
            this.flip(forceFlipHSide);
        },

        kill: function(dieFlipHSide) {
            this.isDead = true;
            this.playAnimation(this.skin, "die");
            if (dieFlipHSide) {
                this.flip(dieFlipHSide);
            }
            this.middlewareOnKill();
        },

		checkMaxGroundFall: function() {
			if (!this.isDead && this.body.y > this._root.background.ground.y){
				this.receiveDamage(this.health);
			}
		},

        getSafestMoveXRange: function(body, flipH, targetRange, wall1, wall2) {
            wall1 = wall1 || this._root.background.wall1;
            wall2 = wall2 || this._root.background.wall2;
            var wall1RightEnd = wall1.x + wall1.width;
            var wall2LeftEnd = wall2.x;
            var x = body.x + targetRange * flipH; 
            if (x <= wall1RightEnd) {
                x = wall1RightEnd + body.width;
            }
            if (x >= wall2LeftEnd) {
                x = wall2LeftEnd - body.width;
            }
            return x;
        },

        onCompleteAttack: function(duration, callback, isFirstResetAttack, isForceReset) {
            isFirstResetAttack = isFirstResetAttack !== undefined ? isFirstResetAttack : true;
            if (this.isAttack || isForceReset) {
                if (isFirstResetAttack) {
                    this.isAttack = false;
                    this.middlewareOnCompleteAttack();
                }
                this.timeouts.allowAttack = setTimeout(function() {
                    this.isAllowAttack = true;
                    this.isAttack = false;
                    if (callback) {
                        callback();
                    }
                }.bind(this), duration);
            }
        },

        updateSkinToBody: function() {
            if (this.skin) {
                this.skin.x = this.body.x - this.body.halfWidth;
                this.skin.y = this.body.y;
            }
        },

        updateAttackHitAreaToBody: function() {
            if (this.attackHitArea) {
                this.attackHitArea.x = this.isFlipH() ? this.body.x - this.body.width : this.body.centerX;
                this.attackHitArea.y = this.body.y;
                this.attackHitArea.visible = !this.isDead && this.isAttack && this._root.config.debug;
            }
        },

        update: function(isSyncWithGameOver) {
            this._update(true);
			this.checkMaxGroundFall();
			this.onUpdate();
        },

		onUpdate: function(){},
        middlewareOnCompleteAttack: function() {},
        middlewareOnKill: function() {},
        onSkinAnimationComplete: function() {}

    });
}
