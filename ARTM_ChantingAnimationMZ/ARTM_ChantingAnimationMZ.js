// ===================================================
// ARTM_ChantingAnimationMZ
// Copyright (c) 2021 Artemis
// This software is released under the MIT license.
// http://opensource.org/licenses/mit-license.php
// =============================================================================
// [Version]
// 1.0.0 初版
// 1.1.0 魔法以外のスキルタイプにも対応
// 1.2.0 拙作プラグイン「ARTM_EnemyAsActorSpriteMZ」に対応
// 1.3.0 アクションフェーズ時の詠唱アニメーション継続ON/OFFを追加
//       詠唱完了後もアニメーションのフラッシュ色が残り続ける不具合を解消
// 1.3.1 詠唱アニメーション継続OFF設定時、イベント発生中も中断するよう対応
//       リファクタリングを実施、リファクタリング漏れ対応
// =============================================================================
/*:ja
 * @target MZ
 * @plugindesc 詠唱中アニメーションを追加するMZ専用プラグイン
 * @author Artemis
 *
 * @help ARTM_ChantingAnimationMZ.js
 * 詠唱中アニメーションを追加するMZ専用プラグインです。
 *
 *--------------
 * ご使用方法
 *--------------
 * 本プラグインを導入し下記設定を行って下さい。
 *
 * ★タグ設定
 * 対象スキルのメモ欄へ下記形式のタグを追加して下さい。
 *
 *  <CA_ANIM_ID:アニメーションID>
 *
 *  【例】アニメーションID：40を使用する
 *   <CA_ANIM_ID:40>
 *
 * ★パラメータ設定
 * 詠唱アニメーション継続設定
 *    ON:中断要シーンでも詠唱アニメーションを継続します。
 *   OFF:中断要シーンでは詠唱アニメーションを中断します。
 *
 *---------------------------------------------
 * NRP_Dynamicシリーズと併用される場合の注意
 *---------------------------------------------
 * プラグイン管理画面にて本プラグインを必ずNRP_Dynamicシリーズより
 * “上”に置いて下さい。
 *
 *
 * プラグインコマンドはありません。
 *
 * @param keeponAnime
 * @text 詠唱アニメ継続設定
 * @desc 中断要シーンで詠唱アニメーション継続/中断を設定します。
 * 中断要シーン：アクションフェーズ中、イベント発生中
 * @type boolean
 * @on 継続（デフォルト）
 * @off 中断
 * @default true
 */
 
(() => {

    const PLG_NAME = "ARTM_ChantingAnimationMZ";
    const TAG_NAME = "CA_ANIM_ID";
    const parameters = PluginManager.parameters(PLG_NAME);
    const gKeeponAnime = parameters["keeponAnime"];

    //-----------------------------------------------------------------------------
    // function
    //
    function getCantAnimationId(battler) {
        const action = battler.action(0);
        const item = action ? action._item : null;
        const emptyId = -1;
        if (item && item.isSkill()) {
            return item.object().meta.CA_ANIM_ID || emptyId;
        } else {
            return emptyId;
        }
    }

    //-----------------------------------------------------------------------------
    // Game_Temp
    //
    const _Game_Temp_initialize = Game_Temp.prototype.initialize;
    Game_Temp.prototype.initialize = function() {
        _Game_Temp_initialize.call(this);
        this._animationQueueCA = [];
    };

    Game_Temp.prototype.requestAnimationCA = function(sprite, target, animationId) {
        if ($dataAnimations[animationId]) {
            const request = {
                targets: [target],
                animationId: animationId,
                mirror: false,
                sprite: sprite
            };
            this._animationQueueCA.push(request);
            target.startAnimationCA();
        }
    };

    Game_Temp.prototype.retrieveAnimationCA = function() {
        return this._animationQueueCA.shift();
    };

    //-----------------------------------------------------------------------------
    // Game_BattlerBase
    //
    const _Game_BattlerBase_initMembers = Game_BattlerBase.prototype.initMembers;
    Game_BattlerBase.prototype.initMembers = function() {
        _Game_BattlerBase_initMembers.call(this);
        this._animationPlayingCA = false;
        this._animationErrCountCA = 0;
        this._anmPitch = 0;
    };

    Game_BattlerBase.prototype.animationPlayingCA = function() {
        return this._animationPlayingCA;
    };

    Game_BattlerBase.prototype.startAnimationCA = function() {
        this._animationPlayingCA = true;
    };

    Game_BattlerBase.prototype.endAnimationCA = function(sprite) {
        this._animationPlayingCA = false;
    };

    Game_BattlerBase.prototype.nextAnimErrCountCA = function() {
        return ++this._animationErrCountCA;
    };

    Game_BattlerBase.prototype.initAnmErrCountCA = function() {
        this._animationErrCountCA = 0;
    };

    //-----------------------------------------------------------------------------
    // Sprite_Battler
    //
    Sprite_Battler.prototype.updateAnimationCA = function() {
        const battler = this._battler;
        if (battler._tpbState === "casting" &&
            BattleManager.isKeeponAnimationCA()) {
             const animeId = getCantAnimationId(battler);
             if (animeId > 0) {
                 this.requestAnimationCA(animeId);
             } else {
                 return;
             }
        }
    };

    Sprite_Battler.prototype.requestAnimationCA = function(animeId) {
        const battler = this._battler;
        let speed = 0;
        if (battler.action(0)) {
            speed = battler.action(0).item().speed;
        }
        if (speed < 0 && !battler.animationPlayingCA()) {
            $gameTemp.requestAnimationCA(this, battler, animeId);
            battler.initAnmErrCountCA();
        } else if (battler.nextAnimErrCountCA() > battler._anmPitch) {
            battler.initAnmErrCountCA();
            battler.endAnimationCA();
        };
    };

    //-----------------------------------------------------------------------------
    // Sprite_Actor
    //
    const _Sprite_Actor_updateMotion = Sprite_Actor.prototype.updateMotion;
    Sprite_Actor.prototype.updateMotion = function() {
        _Sprite_Actor_updateMotion.call(this);
        this.updateAnimationCA();
    };

    //-----------------------------------------------------------------------------
    // Sprite_Enemy
    //
    const _Sprite_Enemy_updateEffect = Sprite_Enemy.prototype.updateEffect;
    Sprite_Enemy.prototype.updateEffect = function() {
        _Sprite_Enemy_updateEffect.call(this);
        if (!this._enemy._asEnemy) {
            this.updateAnimationCA();
        }
    };

    //-----------------------------------------------------------------------------
    // Sprite_AnimationCA
    //
    function Sprite_AnimationCA(spriteBase) {
        this.initialize(...arguments);
    }

    Sprite_AnimationCA.prototype = Object.create(Sprite_Animation.prototype);
    Sprite_AnimationCA.prototype.constructor = Sprite_AnimationCA;

    Sprite_AnimationCA.prototype.initialize = function(spriteBase) {
        Sprite_Animation.prototype.initialize.call(this);
        this._spriteBase = spriteBase;
    };

    Sprite_AnimationCA.prototype.spriteBaseCA = function() {
        return this._spriteBase;
    };

    //-----------------------------------------------------------------------------
    // Spriteset_Base
    //
    const _Spriteset_Base_initialize = Spriteset_Base.prototype.initialize;
    Spriteset_Base.prototype.initialize = function() {
        _Spriteset_Base_initialize.call(this);
        this._animationSpritesCA = [];
    };

    Spriteset_Base.prototype.createAnimationCA = function(request) {
        const sprite = request.sprite;
        const animation = $dataAnimations[request.animationId];
        const targets = request.targets;
        const mirror = request.mirror;
        let delay = this.animationBaseDelay();
        const nextDelay = this.animationNextDelay();
        if (this.isAnimationForEach(animation)) {
            this.createAnimationSpriteCA(sprite, targets, animation, mirror, delay);
            delay += nextDelay;
        } else {
            this.createAnimationSpriteCA(sprite, targets, animation, mirror, delay);
        }
    };

    Spriteset_Base.prototype.createAnimationSpriteCA = function(
        sprite, targets, animation, mirror, delay
    ) {
        const spriteA = new Sprite_AnimationCA(sprite);
        const targetSprites = this.makeTargetSprites(targets);
        const baseDelay = this.animationBaseDelay();
        const previous = delay > baseDelay ? this.lastAnimationSprite() : null;
        if (this.animationShouldMirror(targets[0])) {
            mirror = !mirror;
        }
        spriteA.targetObjects = targets;
        spriteA.setup(targetSprites, animation, mirror, delay, previous);
        spriteA._animation.displayType = -1;
        targets[0]._anmPitch = parseInt(120 / (spriteA._animation.speed / 100)) * 1.5;
        this._effectsContainer.addChild(spriteA);
        this._animationSpritesCA.push(spriteA);
    };

    const _Spriteset_Base_updateAnimations = Spriteset_Base.prototype.updateAnimations;
    Spriteset_Base.prototype.updateAnimations = function() {
        _Spriteset_Base_updateAnimations.call(this);
        for (const sprite of this._animationSpritesCA) {
            const target = sprite.targetObjects[0];
            if (target._tpbState !== "casting" || !sprite.isPlaying()) {
                this.removeAnimationCA(sprite);
            } else if (!BattleManager.isKeeponAnimationCA()) {
                this.removeAnimationCA(sprite);
            }
            if (!sprite.isPlaying()) {
                sprite.spriteBaseCA().setBlendColor([0, 0, 0, 0]);
            }
        }
        this.processAnimationRequestsCA();
    };

    Spriteset_Base.prototype.processAnimationRequestsCA = function() {
        for (;;) {
            const request = $gameTemp.retrieveAnimationCA();
            if (request) {
                this.createAnimationCA(request);
            } else {
                break;
            }
        }
    };

    Spriteset_Base.prototype.removeAnimationCA = function(sprite) {
        const target = sprite.targetObjects[0];
        this._animationSpritesCA.remove(sprite);
        this._effectsContainer.removeChild(sprite);
        target.endAnimationCA();
        sprite.destroy();
    };

    //-----------------------------------------------------------------------------
    // BattleManager
    //
    const _BattleManager_initMembers = BattleManager.initMembers;
    BattleManager.initMembers = function() {
        _BattleManager_initMembers.call(this);
        this._phasePreCA = "";
    };

    const _BattleManager_startAction = BattleManager.startAction;
    BattleManager.startAction = function() {
        _BattleManager_startAction.call(this);
        const subject = this._subject;
        subject.endAnimationCA();
    };

    BattleManager.isKeeponAnimationCA = function() {
        const targetPhase = ["battleEnd", ""];
        if (gKeeponAnime === "false") { 
            targetPhase.push("action");
            if ($gameTroop.isEventRunning() ||
                SceneManager.isSceneChanging()) {
                 return false;
            }
        }
        return !targetPhase.includes(this._phase);
    };

})();