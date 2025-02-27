// ===================================================
// ARTM_ChantingAnimationMZ
// Copyright (c) 2021 Artemis
// This software is released under the MIT license.
// http://opensource.org/licenses/mit-license.php
// =============================================================================
// [Version]
// 1.0.0 初版
// 1.1.0 魔法以外のスキルタイプにも対応
// 1.3.0 アクションフェーズ時の詠唱アニメーション継続ON/OFFを追加
//       詠唱完了後もアニメーションのフラッシュ色が残り続ける不具合を解消
// 1.3.1 詠唱アニメーション継続OFF設定時、イベント発生中も中断するよう対応
// 1.4.0 「ARTM_EnemyAsActorSpriteMZ」を廃止したため、関連する対応を削除
//       その他のパフォーマンス改善
// =============================================================================
/*:ja
 * @target MZ
 * @plugindesc 指定IDのアニメーションを詠唱者に表示するMZ専用プラグイン
 * @author Artemis
 *
 * @help ARTM_ChantingAnimationMZ.js
 * 指定IDのアニメーションを詠唱者に表示するMZ専用プラグインです。
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
 * プラグインコマンドはありません。
 *
 * @param keepAnime
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
    const params = PluginManager.parameters(PLG_NAME);
    const KeepAnime = (params["keepAnime"] || "false").toLowerCase() === "true";

    //-----------------------------------------------------------------------------
    // function
    //
    function getCantAnimationId(battler) {
        const item = battler.action(0)?._item;
        if (item?.isSkill()) {
            return item.object().meta.CA_ANIM_ID || -1;
        } else {
            return -1;
        }
    }

    //-----------------------------------------------------------------------------
    // Game_Temp
    //
    const _Game_Temp_initialize = Game_Temp.prototype.initialize;
    Game_Temp.prototype.initialize = function() {
        _Game_Temp_initialize.call(this);
        this._animationQueueArtm = [];
    };

    Game_Temp.prototype.requestAnimation_Artm = function(sprite, target, animationId) {
        if ($dataAnimations[animationId]) {
            const request = {
                targets: [target],
                animationId: animationId,
                mirror: false,
                sprite: sprite
            };
            this._animationQueueArtm.push(request);
            target.startAnimation_Artm();
        }
    };

    Game_Temp.prototype.retrieveAnimation_Artm = function() {
        return this._animationQueueArtm.shift();
    };

    //-----------------------------------------------------------------------------
    // Game_BattlerBase
    //
    const _Game_BattlerBase_initMembers = Game_BattlerBase.prototype.initMembers;
    Game_BattlerBase.prototype.initMembers = function() {
        _Game_BattlerBase_initMembers.call(this);
        this._animationPlayingArtm = false;
        this._animationErrCountArtm = 0;
        this._animationPitchArtm = 0;
    };

    Game_BattlerBase.prototype.animationPlaying_Artm = function() {
        return this._animationPlayingArtm;
    };

    Game_BattlerBase.prototype.startAnimation_Artm = function() {
        this._animationPlayingArtm = true;
    };

    Game_BattlerBase.prototype.endAnimation_Artm = function(sprite) {
        this._animationPlayingArtm = false;
    };

    Game_BattlerBase.prototype.nextAnimeErrCount_Artm = function() {
        return ++this._animationErrCountArtm;
    };

    Game_BattlerBase.prototype.initAnimeErrCount_Artm = function() {
        this._animationErrCountArtm = 0;
    };

    //-----------------------------------------------------------------------------
    // Sprite_Battler
    //
    Sprite_Battler.prototype.updateAnimation_Artm = function() {
        if (
            this._battler._tpbState === "casting" &&
            BattleManager.isKeepAnimation_Artm()
        ) {
            const animeId = getCantAnimationId(this._battler);
            if (animeId > 0) {
                this.requestAnimation_Artm(animeId);
            }
        }
    };

    Sprite_Battler.prototype.requestAnimation_Artm = function(animeId) {
        const battler = this._battler;
        let speed = 0;
        if (battler.action(0)) {
            speed = battler.action(0).item().speed;
        }
        if (speed < 0 && !battler.animationPlaying_Artm()) {
            $gameTemp.requestAnimation_Artm(this, battler, animeId);
            battler.initAnimeErrCount_Artm();
        } else if (battler.nextAnimeErrCount_Artm() > battler._animationPitchArtm) {
            battler.initAnimeErrCount_Artm();
            battler.endAnimation_Artm();
        };
    };

    //-----------------------------------------------------------------------------
    // Sprite_Actor
    //
    const _Sprite_Actor_updateMotion = Sprite_Actor.prototype.updateMotion;
    Sprite_Actor.prototype.updateMotion = function() {
        _Sprite_Actor_updateMotion.call(this);
        this.updateAnimation_Artm();
    };

    //-----------------------------------------------------------------------------
    // Sprite_Enemy
    //
    const _Sprite_Enemy_updateEffect = Sprite_Enemy.prototype.updateEffect;
    Sprite_Enemy.prototype.updateEffect = function() {
        _Sprite_Enemy_updateEffect.call(this);
        this.updateAnimation_Artm();
    };

    //-----------------------------------------------------------------------------
    // Sprite_Animation_Artm
    //
    function Sprite_Animation_Artm(spriteBase) {
        this.initialize(...arguments);
    }

    Sprite_Animation_Artm.prototype = Object.create(Sprite_Animation.prototype);
    Sprite_Animation_Artm.prototype.constructor = Sprite_Animation_Artm;

    Sprite_Animation_Artm.prototype.initialize = function(spriteBase) {
        Sprite_Animation.prototype.initialize.call(this);
        this._spriteBase = spriteBase;
    };

    Sprite_Animation_Artm.prototype.spriteBase_Artm = function() {
        return this._spriteBase;
    };

    //-----------------------------------------------------------------------------
    // Spriteset_Base
    //
    const _Spriteset_Base_initialize = Spriteset_Base.prototype.initialize;
    Spriteset_Base.prototype.initialize = function() {
        _Spriteset_Base_initialize.call(this);
        this._animationSpritesArtm = [];
    };

    Spriteset_Base.prototype.createAnimation_Artm = function(request) {
        const sprite = request.sprite;
        const animation = $dataAnimations[request.animationId];
        const targets = request.targets;
        const mirror = request.mirror;
        let delay = this.animationBaseDelay();
        const nextDelay = this.animationNextDelay();
        if (this.isAnimationForEach(animation)) {
            this.createAnimationSprite_Artm(sprite, targets, animation, mirror, delay);
            delay += nextDelay;
        } else {
            this.createAnimationSprite_Artm(sprite, targets, animation, mirror, delay);
        }
    };

    Spriteset_Base.prototype.createAnimationSprite_Artm = function(
        sprite, targets, animation, mirror, delay
    ) {
        const spriteAnimation = new Sprite_Animation_Artm(sprite);
        const targetSprites = this.makeTargetSprites(targets);
        const baseDelay = this.animationBaseDelay();
        const previous = delay > baseDelay ? this.lastAnimationSprite() : null;
        if (this.animationShouldMirror(targets[0])) {
            mirror = !mirror;
        }
        spriteAnimation.targetObjects = targets;
        spriteAnimation.setup(targetSprites, animation, mirror, delay, previous);
        spriteAnimation._animation.displayType = -1;
        targets[0]._animationPitchArtm =
            parseInt(120 / (spriteAnimation._animation.speed / 100)) * 1.5;
        this._effectsContainer.addChild(spriteAnimation);
        this._animationSpritesArtm.push(spriteAnimation);
    };

    const _Spriteset_Base_updateAnimations = Spriteset_Base.prototype.updateAnimations;
    Spriteset_Base.prototype.updateAnimations = function() {
        _Spriteset_Base_updateAnimations.call(this);
        for (const sprite of this._animationSpritesArtm) {
            if (
                sprite.targetObjects[0]._tpbState !== "casting" ||
                !sprite.isPlaying()
            ) {
                this.removeAnimation_Artm(sprite);
            } else if (!BattleManager.isKeepAnimation_Artm()) {
                this.removeAnimation_Artm(sprite);
            }
            if (!sprite.isPlaying()) {
                sprite.spriteBase_Artm().setBlendColor([0, 0, 0, 0]);
            }
        }
        this.processAnimationRequests_Artm();
    };

    Spriteset_Base.prototype.processAnimationRequests_Artm = function() {
        for (;;) {
            const request = $gameTemp.retrieveAnimation_Artm();
            if (request) {
                this.createAnimation_Artm(request);
            } else {
                break;
            }
        }
    };

    Spriteset_Base.prototype.removeAnimation_Artm = function(sprite) {
        const target = sprite.targetObjects[0];
        this._animationSpritesArtm.remove(sprite);
        this._effectsContainer.removeChild(sprite);
        target.endAnimation_Artm();
        sprite.destroy();
    };

    //-----------------------------------------------------------------------------
    // BattleManager
    //
    const _BattleManager_initMembers = BattleManager.initMembers;
    BattleManager.initMembers = function() {
        _BattleManager_initMembers.call(this);
    };

    const _BattleManager_startAction = BattleManager.startAction;
    BattleManager.startAction = function() {
        _BattleManager_startAction.call(this);
        const subject = this._subject;
        subject.endAnimation_Artm();
    };

    BattleManager.isKeepAnimation_Artm = function() {
        const targetPhase = ["battleEnd", ""];
        if (!KeepAnime) { 
            if (
                $gameTroop.isEventRunning() ||
                SceneManager.isSceneChanging()
            ) {
                return false;
            }
            targetPhase.push("action");
        }
        return !targetPhase.includes(this._phase);
    };

})();