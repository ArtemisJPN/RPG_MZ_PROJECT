// ===================================================
// ARTM_SkillOtherTargetMZ_PatchNUUN
// Copyright (c) 2026 Artemis
// This software is released under the MIT license.
// http://opensource.org/licenses/mit-license.php
// -------------
// [Version]
// 1.0.0 初版
// ====================================================
/*:ja
 * @target MZ
 * @plugindesc ARTM_SkillOtherTargetMZ と NUUN_BattleStyleEX の連携パッチ
 * @author Artemis
 * @base ARTM_SkillOtherTargetMZ
 * @orderAfter ARTM_SkillOtherTargetMZ
 * @orderAfter NUUN_BattleStyleEX_Base
 *
 * @help ARTM_SkillOtherTargetMZ_PatchNUUN
 * ARTM_SkillOtherTargetMZ と NUUN_BattleStyleEX を併用するための
 * 連携パッチプラグインです。
 *
 * ----------------------------------------------------------------------------
 * ■ 配置順
 * ----------------------------------------------------------------------------
 * プラグイン管理画面において、必ず以下の順序で配置してください。
 *
 *   1. NUUN_Base
 *   2. NUUN_BattleStyleEX
 *   3. NUUN_BattleStyleEX_Base
 *   4. ARTM_SkillOtherTargetMZ
 *   5. ARTM_SkillOtherTargetMZ_PatchNUUN （★本パッチを一番下に配置）
 *
 * ----------------------------------------------------------------------------
 * ■ 注意事項
 * ----------------------------------------------------------------------------
 * 本パッチは NUUN_BattleStyleEX の内部仕様に依存しているため、
 * 将来的な NUUN 氏側プラグインのアップデート等により動作しなくなる
 * 可能性があります（動作無保証・ベストエフォート対応となります）。
 */

(() => {
    "use strict";

    if (!Imported.NUUN_BattleStyleEX_Base) {
        return;
    }

    //-----------------------------------------------------------------------------
    // Scene_Battle
    //-----------------------------------------------------------------------------
    const _Scene_Battle_createStatusWindow = Scene_Battle.prototype.createStatusWindow;
    Scene_Battle.prototype.createStatusWindow = function() {
        _Scene_Battle_createStatusWindow.call(this);
        if (this._actorImges) {
            applyActorImgesPatch(this._actorImges);
        }
        if (this._actorStatus) {
            applyActorStatusPatch(this._actorStatus);
        }
    };

    function applyActorImgesPatch(targetWindow) {
        const proto = Object.getPrototypeOf(targetWindow);
        if (proto._artmPatched) return;
        proto._artmPatched = true;

        const _maxItems = proto.maxItems;
        proto.maxItems = function() {
            if ($gameTemp && $gameTemp._isBattleExceptUserArtm) {
                return this.targetMembersCustom().length;
            }
            return _maxItems.call(this);
        };

        const _actor = proto.actor;
        proto.actor = function(index) {
            if ($gameTemp && $gameTemp._isBattleExceptUserArtm) {
                return this.targetMembersCustom()[index] || null;
            }
            return _actor.call(this, index);
        };

        const _refresh = proto.refresh;
        proto.refresh = function() {
            _refresh.call(this);

            if (!this._additionalSprites) return;

            if ($gameTemp && $gameTemp._isBattleExceptUserArtm) {
                const validMembers = this.targetMembersCustom();
                for (const actor of $gameParty.battleMembers()) {
                    const key = "actor%1-img".format(actor.actorId());
                    const sprite = this._additionalSprites[key];
                    if (sprite) {
                        if (!validMembers.includes(actor)) {
                            sprite.hide();
                        } else {
                            sprite.show();
                        }
                    }
                }
            } else {
                for (const actor of $gameParty.battleMembers()) {
                    const key = "actor%1-img".format(actor.actorId());
                    const sprite = this._additionalSprites[key];
                    if (sprite) {
                        sprite.show();
                    }
                }
            }
        };
    }

    function applyActorStatusPatch(targetWindow) {
        const proto = Object.getPrototypeOf(targetWindow);
        if (proto._artmPatched) return;
        proto._artmPatched = true;

        const _maxItems = proto.maxItems;
        proto.maxItems = function() {
            if ($gameTemp && $gameTemp._isBattleExceptUserArtm) {
                return this.targetMembersCustom().length;
            }
            return _maxItems.call(this);
        };

        const _actor = proto.actor;
        proto.actor = function(index) {
            if ($gameTemp && $gameTemp._isBattleExceptUserArtm) {
                return this.targetMembersCustom()[index] || null;
            }
            return _actor.call(this, index);
        };
    }

    function refreshNuunSubWindows(scene) {
        if (scene._actorImges) {
            scene._actorImges.refresh();
        }
        if (scene._actorStatus) {
            scene._actorStatus.refresh();
        }
    }

    const _Scene_Battle_resetExceptUserArtm = Scene_Battle.prototype.resetExceptUserArtm;
    Scene_Battle.prototype.resetExceptUserArtm = function() {
        const wasActive = $gameTemp && $gameTemp._isBattleExceptUserArtm;
        _Scene_Battle_resetExceptUserArtm.call(this);
        if (wasActive) {
            refreshNuunSubWindows(this);
        }
    };

    const _Scene_Battle_onSkillOk = Scene_Battle.prototype.onSkillOk;
    Scene_Battle.prototype.onSkillOk = function() {
        _Scene_Battle_onSkillOk.call(this);
        if ($gameTemp && $gameTemp._isBattleExceptUserArtm) {
            refreshNuunSubWindows(this);
        }
    };

    const _Scene_Battle_onActorOk = Scene_Battle.prototype.onActorOk;
    Scene_Battle.prototype.onActorOk = function() {
        _Scene_Battle_onActorOk.call(this);
        refreshNuunSubWindows(this);
    };

    const _Scene_Battle_changeInputWindow = Scene_Battle.prototype.changeInputWindow;
    Scene_Battle.prototype.changeInputWindow = function() {
        if (this._actorWindow && !this._actorWindow.active) {
            if ($gameTemp && $gameTemp._isBattleExceptUserArtm) {
                this.resetExceptUserArtm();
                refreshNuunSubWindows(this);
            }
        }
        _Scene_Battle_changeInputWindow.call(this);
    };

})();