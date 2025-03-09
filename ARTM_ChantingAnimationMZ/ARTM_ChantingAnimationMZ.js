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
// 1.5.0 終了フレームの指定機能を追加（アニメーション間の途切れ防止）
// =============================================================================
/*:ja
 * @target MZ
 * @plugindesc 指定IDのアニメーションを詠唱者に表示するMZ専用プラグイン
 * @author Artemis
 *
 * @help ARTM_ChantingAnimationMZ.js
 * アクターやエネミーがスキル詠唱中、
 * その詠唱者に指定IDのアニメーションを表示し続けるMZ専用プラグインです。
 *
 *--------------
 * ご使用方法
 *--------------
 *
 * ■メモ欄の設定について
 * 対象スキルのメモ欄に値をセットして下さい。
 *
 *【書式】
 * 　<CA_INFO:ID(アニメーションID),ED_FRAME(終了フレーム)>
 *
 * 　【記載例1】
 * 　　ID：0050のアニメーションをループ再生する場合
 * 　　<CA_INFO:ID50>
 *
 * 　　途切れることなくループさせたい場合は、ED_FRAMEの値を調整して下さい。
 *
 * 　【記載例2】
 * 　　例としてEffekseerツールで開始フレーム：-2,生存フレーム：120の場合、
 * 　　<CA_INFO:ID50,ED_FRAME113>
 * 
 * ■アニメーションの制約について
 * 「Effekseer」ツール以外で編集したデータは動作対象外です。
 *
 * ■プラグインパラメータについて
 * 詠唱アニメーション継続設定
 *    ON:中断シーンでも詠唱アニメーションを継続します。
 *   OFF:中断シーンでは詠唱アニメーションを中断します。
 * 　（中断シーンとは、イベント発生中や攻撃中を指します。）
 *
 * プラグインコマンドはありません。
 *
 * @param keepAnime
 * @text 詠唱アニメ継続設定
 * @desc 中断シーンでのアニメーション継続/中断を設定します。
 * 中断シーンとは、イベント発生中や攻撃中を指します。
 * @type boolean
 * @on 継続
 * @off 中断（デフォルト）
 * @default false
 */
 
(() => {

    const PLG_NAME = "ARTM_ChantingAnimationMZ";
    const TAG_NAME = "CA_INFO";
    const params = PluginManager.parameters(PLG_NAME);
    const KeepAnime = (params["keepAnime"] || "false").toLowerCase() === "true";

    //-----------------------------------------------------------------------------
    // Game_Temp
    //
    const _Game_Temp_initialize = Game_Temp.prototype.initialize;
    Game_Temp.prototype.initialize = function() {
        _Game_Temp_initialize.call(this);
        this._animationQueueArtm = [];
    };

    Game_Temp.prototype.requestAnimation_Artm = function(sprite, animationId) {
        const target = sprite._battler;
        if ($dataAnimations[animationId]) {
            const request = {
                targets: [target],
                animationId: animationId,
                mirror: false,
                spriteBattler: sprite
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
        this._animationCountArtm = 0;
        this._animationPitchArtm = 0;
    };

    Game_BattlerBase.prototype.animationPlaying_Artm = function() {
        return this._animationPlayingArtm;
    };

    Game_BattlerBase.prototype.startAnimation_Artm = function() {
        this._animationPlayingArtm = true;
    };

    Game_BattlerBase.prototype.endAnimation_Artm = function() {
        this._animationPlayingArtm = false;
    };

    Game_BattlerBase.prototype.initAnimationCount_Artm = function() {
        this._animationCountArtm = 0;
    };

    Game_BattlerBase.prototype.nextAnimationCount_Artm = function() {
        return ++this._animationCountArtm;
    };

    Game_BattlerBase.prototype.initAnimationPitch_Artm = function(speed) {
        this._animationPitchArtm = parseInt(120 / (speed / 100)) * 1.5;
    };

    Game_BattlerBase.prototype.animationPitch_Artm = function() {
        return this._animationPitchArtm;
    };

    //-----------------------------------------------------------------------------
    // Sprite_Battler
    //
    const _Sprite_Battler_initMembers = Sprite_Battler.prototype.initMembers;
    Sprite_Battler.prototype.initMembers = function() {
        _Sprite_Battler_initMembers.call(this);
        this._chantInfoArtm = null;
        this._tpbStatePrevArtm = "";
    };

    Sprite_Battler.prototype.canChantAnime_Artm = function() {
        return (
            this._battler._tpbState === "casting" &&
            this._tpbStatePrevArtm !== "casting" &&
            BattleManager.isKeepAnimation_Artm()
        );
    };

    Sprite_Battler.prototype.updateChantInfo_Artm = function() {
        const item = this._battler.action(0)?._item;
        let regexp, m;
        if (item?.isSkill()) {
            const param = item.object().meta[TAG_NAME];
            regexp = /^ID([0-9]+),ED_FRAME([0-9]+)$/g;
            m = regexp.exec(param);
            if (m) {
                this._chantInfoArtm = [Number(m[1]), Number(m[2])];
                return;
            }
            regexp = /^ID([0-9]+)$/g;
            m = regexp.exec(param);
            if (m) {
                this._chantInfoArtm = [Number(m[1]), -1];
                return;
            }
        }
        this._chantInfoArtm = [-1];
    };

    Sprite_Battler.prototype.chantInfo_Artm = function() {
        return this._chantInfoArtm;
    };

    Sprite_Battler.prototype.updateAnimation_Artm = function() {
        if (this.canChantAnime_Artm()) {
            this.updateChantInfo_Artm();
            this.requestAnimation_Artm(this.chantInfo_Artm()[0]);
        }
        if (BattleManager.isKeepAnimation_Artm()) {
            this._tpbStatePrevArtm = this._battler._tpbState;
        }
    };

    Sprite_Battler.prototype.requestAnimation_Artm = function(animationId) {
        if (animationId <= 0) { return; } 
        const battler = this._battler;
        let speed = 0;
        if (battler.action(0)) {
            speed = battler.action(0).item().speed;
        }
        if (speed < 0 && !battler.animationPlaying_Artm()) {
            $gameTemp.requestAnimation_Artm(this, animationId);
            battler.initAnimationCount_Artm();
        } else if (battler.nextAnimationCount_Artm() > battler._animationPitchArtm) {
            battler.initAnimationCount_Artm();
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

    Sprite_Animation_Artm.prototype.spriteBase = function() {
        return this._spriteBase;
    };

    //-----------------------------------------------------------------------------
    // Spriteset_Base
    //
    const _Spriteset_Base_initialize = Spriteset_Base.prototype.initialize;
    Spriteset_Base.prototype.initialize = function() {
        _Spriteset_Base_initialize.call(this);
        this._animationSpritesArtm = [];
        this._queueArtm = [];
    };

    Spriteset_Base.prototype.createAnimation_Artm = function(request) {
        const sprite = request.spriteBattler;
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
        if (this.animationShouldMirror(targets[0])) { mirror = !mirror; }
        spriteAnimation.targetObjects = targets;
        spriteAnimation.setup(targetSprites, animation, mirror, delay, previous);
        spriteAnimation._animation.displayType = -1;
        targets[0].initAnimationPitch_Artm(spriteAnimation._animation.speed);
        this._effectsContainer.addChild(spriteAnimation);
        this._animationSpritesArtm.push(spriteAnimation);
    };

    const _Spriteset_Base_updateAnimations = Spriteset_Base.prototype.updateAnimations;
    Spriteset_Base.prototype.updateAnimations = function() {
        _Spriteset_Base_updateAnimations.call(this);
        this._queueArtm = [];
        this.updateAnimations_Artm();
        this.processAnimationRequests_Artm();
    };

    Spriteset_Base.prototype.insertQueue_Artm = function(sprite) {
        const spriteBase = sprite.spriteBase();
        const sprites = this._animationSpritesArtm;
        if (sprites.filter(s => s.spriteBase() === spriteBase).length < 2)
        {
            this._queueArtm.push([spriteBase, sprite._animation.id]);
        }
    };

    Spriteset_Base.prototype.checkEnd_Artm = function(sprite) {
        const spriteBase = sprite.spriteBase();
        const endFrameIndex = spriteBase.chantInfo_Artm()[1];
        const flags = [!sprite.isPlaying(), false];
        flags.push(spriteBase._battler._tpbState === "casting"); 
        flags.push(endFrameIndex === -1);
        flags.push(sprite._frameIndex === endFrameIndex);
        if (!BattleManager.isKeepAnimation_Artm()) {
            flags[1] = true;
            if (flags[2]) {
                spriteBase._tpbStatePrevArtm = "waiting";
            }
        }
        return flags;
    };

    Spriteset_Base.prototype.updateAnimations_Artm = function() {
        for (const sprite of this._animationSpritesArtm) {
            const flags = this.checkEnd_Artm(sprite);
            if (flags[0] || flags[1]) {
                this.removeAnimation_Artm(sprite);
                if (flags[2] && flags[3]) {
                    this.insertQueue_Artm(sprite);
                }
            } else if (flags[2] && flags[4]) {
                this.insertQueue_Artm(sprite);
            } else if (!flags[2]) {
                this.removeAnimation_Artm(sprite);
            }
        }
        for (const d of this._queueArtm) {
            $gameTemp.requestAnimation_Artm(d[0], d[1]);
        }
    }

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
        if (!sprite.isPlaying()) {
            sprite.spriteBase().setBlendColor([0, 0, 0, 0]);
        }
        this._animationSpritesArtm.remove(sprite);
        this._effectsContainer.removeChild(sprite);
        sprite.targetObjects[0].endAnimation_Artm();
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
            ) { return false; }
            targetPhase.push("action");
        }
        return !targetPhase.includes(this._phase);
    };

})();