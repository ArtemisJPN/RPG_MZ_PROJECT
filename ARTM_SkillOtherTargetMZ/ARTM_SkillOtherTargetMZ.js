// ===================================================
// ARTM_SkillOtherTargetMZ
// Copyright (c) 2021 Artemis
// This software is released under the MIT license.
// http://opensource.org/licenses/mit-license.php
// -------------
// [Version]
// 1.2.0 他プラグインとの競合対応
// 1.1.0 対象選択時の表示・操作不具合の修正、内部処理の最適化
// 1.0.0 初版
// ====================================================
/*:ja
 * @target MZ
 * @plugindesc 対象選択ウィンドウから「使用者自身」を完全に非表示・除外するプラグイン
 * @author Artemis
 *
 * @help ARTM_SkillOtherTargetMZ
 * スキルの対象選択時、リストから「使用者（詠唱者）自身」の項目そのものを
 * 完全に非表示（除外）にするプラグインです。
 * 戦闘画面・メニュー画面の両方に対応しています。
 *
 * ----------------------------------------------------------------------------
 * ■ 本プラグインの特徴（一般的な除外プラグインとの違い）
 * ----------------------------------------------------------------------------
 * 従来の類似プラグインの多くは、対象選択画面に使用者が表示されたまま
 * 「グレーアウトして選択不能にする（選ぶとブザーが鳴る）」仕様でした。
 *
 * 本プラグインは【対象選択ウィンドウから使用者の情報（顔やステータス）
 * を完全消去】し、残りの対象のみでリストを自動的に詰めて再構成します。
 *
 * 【導入のメリット】
 * ・選べない対象にカーソルを合わせる無駄な手数が減り、入力テンポが向上。
 * ・「他の仲間に託す」「味方をかばわせる」など、演出・UIをスッキリ整理。
 *
 * ----------------------------------------------------------------------------
 * ■ 使い方
 * ----------------------------------------------------------------------------
 * 対象スキルのメモ欄に、以下のタグを記述してください。
 *
 *   <SOT_STATE:VALID>
 *
 * ----------------------------------------------------------------------------
 * ■ 範囲ごとの挙動
 * ----------------------------------------------------------------------------
 * 【味方単体】
 *   ・アクター：選択画面で使用者が非表示になり、
 *               残りの味方のみでリストを再構成します。
 *   ・エネミー：使用者以外の生存味方からランダムに対象を決定します。
 *
 * 【味方全体】
 *   ・使用者以外の味方全員が対象になります。
 *
 * 【敵味方全体】
 *   ・使用者以外の敵・味方全員が対象になります。
 *
 * ※使用者以外の対象が生存していない場合、スキルは使用不可になります。
 * ※プラグインコマンドはありません。
 *
 * ----------------------------------------------------------------------------
 * ■ 配置上の注意
 * ----------------------------------------------------------------------------
 * プラグイン管理画面において、メニューやステータスウィンドウ等を
 * 拡張する他のプラグインよりも【下】に配置してください。
 *
 */

(() => {
    "use strict";

    const TAG_NAME = "SOT_STATE";

    //-----------------------------------------------------------------------------
    // function
    //-----------------------------------------------------------------------------
    function getOperatingActor() {
        if ($gameParty.inBattle()) {
            if (typeof BattleManager.actor === "function" && BattleManager.actor()) {
                return BattleManager.actor();
            }
            return BattleManager._currentActor || null;
        } else {
            const scene = SceneManager._scene;
            if (scene && typeof scene.user === "function") {
                return scene.user();
            }
            return null;
        }
    }

    //-----------------------------------------------------------------------------
    // Game_Temp
    //-----------------------------------------------------------------------------
    const _Game_Temp_initialize = Game_Temp.prototype.initialize;
    Game_Temp.prototype.initialize = function() {
        _Game_Temp_initialize.call(this);
        this._isBattleExceptUserArtm = false;
        this._isMenuExceptUserArtm = false;
    };

    //-----------------------------------------------------------------------------
    // Game_Action
    //-----------------------------------------------------------------------------
    Game_Action.prototype.isSkillCustom = function() {
        return DataManager.isSkill(this.item()) && !!this.item().meta[TAG_NAME];
    };

    const _Game_Action_makeTargets = Game_Action.prototype.makeTargets;
    Game_Action.prototype.makeTargets = function() {
        const subject = this.subject();
        const isCustom = this.isSkillCustom();
        let targets = _Game_Action_makeTargets.call(this);

        if (!isCustom) {
            return targets;
        } else if (!this.isForUser() && this.isForOne()) {
            return this.makeTargetsCustom(targets);
        } else if (this.isForAll()) {
            return targets.filter(t => t !== subject);
        } else {
            return [];
        }
    };

    Game_Action.prototype.makeTargetsCustom = function(targets) {
        const subject = this.subject();
        if (targets.includes(subject)) {
            const unit = this.friendsUnit();
            const aliveExceptSubject = unit.aliveMembers().filter(m => m !== subject);
            if (aliveExceptSubject.length > 0) {
                return [aliveExceptSubject[Math.randomInt(aliveExceptSubject.length)]];
            } else {
                return [];
            }
        }
        return targets;
    };

    //-----------------------------------------------------------------------------
    // Game_BattlerBase
    //-----------------------------------------------------------------------------
    const _Game_BattlerBase_meetsSkillConditions = Game_BattlerBase.prototype.meetsSkillConditions;
    Game_BattlerBase.prototype.meetsSkillConditions = function(skill) {
        if (skill.meta[TAG_NAME]) {
            const action = new Game_Action(this);
            action.setItemObject(skill);
            if (action.isForFriend()) {
                const unit = this.friendsUnit();
                const aliveOthers = unit.aliveMembers().filter(m => m !== this);
                if (aliveOthers.length === 0) {
                    return false;
                }
            }
        }
        return _Game_BattlerBase_meetsSkillConditions.call(this, skill);
    };

    //-----------------------------------------------------------------------------
    // Window_MenuActor
    //-----------------------------------------------------------------------------
    Window_MenuActor.prototype.targetMembersCustom = function() {
        const user = getOperatingActor();
        return $gameParty.members().filter(m => m !== user);
    };

    const _Window_MenuActor_maxItems = Window_MenuActor.prototype.maxItems;
    Window_MenuActor.prototype.maxItems = function() {
        if ($gameTemp._isMenuExceptUserArtm) {
            return this.targetMembersCustom().length;
        }
        return _Window_MenuActor_maxItems.call(this);
    };

    const _Window_MenuActor_actor = Window_MenuActor.prototype.actor;
    Window_MenuActor.prototype.actor = function(index) {
        if ($gameTemp._isMenuExceptUserArtm) {
            return this.targetMembersCustom()[index];
        }
        return _Window_MenuActor_actor.call(this, index);
    };

    //-----------------------------------------------------------------------------
    // Scene_ItemBase
    //-----------------------------------------------------------------------------
    const _Scene_ItemBase_showActorWindow = Scene_ItemBase.prototype.showActorWindow;
    Scene_ItemBase.prototype.showActorWindow = function() {
        const item = this.item();
        if (DataManager.isSkill(item) && item.meta[TAG_NAME]) {
            $gameTemp._isMenuExceptUserArtm = true;
            this._actorWindow.refresh();
        } else {
            $gameTemp._isMenuExceptUserArtm = false;
            this._actorWindow.refresh();
        }
        _Scene_ItemBase_showActorWindow.call(this);
    };

    const _Scene_ItemBase_hideActorWindow = Scene_ItemBase.prototype.hideActorWindow;
    Scene_ItemBase.prototype.hideActorWindow = function() {
        const needRefresh = $gameTemp._isMenuExceptUserArtm;
        $gameTemp._isMenuExceptUserArtm = false;
        if (needRefresh) {
            this._actorWindow.refresh();
        }
        _Scene_ItemBase_hideActorWindow.call(this);
    };

    const _Scene_ItemBase_itemTargetActors = Scene_ItemBase.prototype.itemTargetActors;
    Scene_ItemBase.prototype.itemTargetActors = function() {
        const item = this.item();
        if (DataManager.isSkill(item) && item.meta[TAG_NAME]) {
            const action = new Game_Action(this.user());
            action.setItemObject(item);
            if (!action.isForFriend()) {
                return [];
            }
            const members = this._actorWindow.targetMembersCustom();
            if (action.isForAll()) {
                return members;
            }
            if (action.isForOne()) {
                const target = members[this._actorWindow.index()];
                return target ? [target] : [];
            }
        }
        return _Scene_ItemBase_itemTargetActors.call(this);
    };

    //-----------------------------------------------------------------------------
    // Window_BattleStatus
    //-----------------------------------------------------------------------------
    Window_BattleStatus.prototype.targetMembersCustom = function() {
        const subject = getOperatingActor();
        return $gameParty.battleMembers().filter(bm => bm !== subject);
    };

    const _Window_BattleStatus_maxItems = Window_BattleStatus.prototype.maxItems;
    Window_BattleStatus.prototype.maxItems = function() {
        if ($gameTemp && $gameTemp._isBattleExceptUserArtm) {
            return this.targetMembersCustom().length;
        }
        return _Window_BattleStatus_maxItems.call(this);
    };

    const _Window_BattleStatus_actor = Window_BattleStatus.prototype.actor;
    Window_BattleStatus.prototype.actor = function(index) {
        if ($gameTemp && $gameTemp._isBattleExceptUserArtm) {
            return this.targetMembersCustom()[index];
        }
        return _Window_BattleStatus_actor.call(this, index);
    };

    const _Window_BattleStatus_itemRect = Window_BattleStatus.prototype.itemRect;
    Window_BattleStatus.prototype.itemRect = function(index) {
        if ($gameTemp && $gameTemp._isBattleExceptUserArtm) {
            const max = this.maxItems();
            if (index >= max) {
                return new Rectangle(0, 0, 0, 0);
            }
        }
        return _Window_BattleStatus_itemRect.call(this, index);
    };

    //-----------------------------------------------------------------------------
    // Scene_Battle
    //-----------------------------------------------------------------------------
    Scene_Battle.prototype.resetExceptUserArtm = function() {
        if ($gameTemp && $gameTemp._isBattleExceptUserArtm) {
            $gameTemp._isBattleExceptUserArtm = false;
            if (this._statusWindow) {
                this._statusWindow.refresh();
            }
        }
    };

    const _Scene_Battle_startActorInput = Scene_Battle.prototype.startActorInput;
    Scene_Battle.prototype.startActorInput = function() {
        this.resetExceptUserArtm();
        _Scene_Battle_startActorInput.call(this);
    };

    const _Scene_Battle_onActorOk = Scene_Battle.prototype.onActorOk;
    Scene_Battle.prototype.onActorOk = function() {
        if ($gameTemp._isBattleExceptUserArtm) {
            const action = BattleManager.inputtingAction();
            const members = this._statusWindow.targetMembersCustom();
            const selectedActor = members[this._actorWindow.index()];
            if (selectedActor && action) {
                const realIndex = $gameParty.battleMembers().indexOf(selectedActor);
                action.setTarget(realIndex);
            }
            $gameTemp._isBattleExceptUserArtm = false;
            this._statusWindow.refresh();
            const originalSetTarget = action ? action.setTarget : null;
            if (action) {
                action.setTarget = function() {};
            }
            try {
                _Scene_Battle_onActorOk.call(this);
            } finally {
                if (action && originalSetTarget) {
                    action.setTarget = originalSetTarget;
                }
            }
            return;
        }
        _Scene_Battle_onActorOk.call(this);
    };

    const _Scene_Battle_onActorCancel = Scene_Battle.prototype.onActorCancel;
    Scene_Battle.prototype.onActorCancel = function() {
        this.resetExceptUserArtm();
        _Scene_Battle_onActorCancel.call(this);
    };

    const _Scene_Battle_commandSkill = Scene_Battle.prototype.commandSkill;
    Scene_Battle.prototype.commandSkill = function() {
        this.resetExceptUserArtm();
        _Scene_Battle_commandSkill.call(this);
    };

    const _Scene_Battle_changeInputWindow = Scene_Battle.prototype.changeInputWindow;
    Scene_Battle.prototype.changeInputWindow = function() {
        if (this._actorWindow && !this._actorWindow.active) {
            this.resetExceptUserArtm();
        }
        _Scene_Battle_changeInputWindow.call(this);
    };

    const _Scene_Battle_onSkillOk = Scene_Battle.prototype.onSkillOk;
    Scene_Battle.prototype.onSkillOk = function() {
        const skill = this._skillWindow.item();
        const action = BattleManager.inputtingAction();
        if (skill && skill.meta[TAG_NAME]) {
            action.setSkill(skill.id);
            BattleManager.actor().setLastBattleSkill(skill);
            if (action.isForFriend() && action.isForOne()) {
                $gameTemp._isBattleExceptUserArtm = true;
                this._statusWindow.refresh();
            } else {
                $gameTemp._isBattleExceptUserArtm = false;
                this._statusWindow.refresh();
            }
            this.onSelectAction();
            return;
        }
        this.resetExceptUserArtm();
        _Scene_Battle_onSkillOk.call(this);
    };

    const _Scene_Battle_terminate = Scene_Battle.prototype.terminate;
    Scene_Battle.prototype.terminate = function() {
        if ($gameTemp) {
            $gameTemp._isBattleExceptUserArtm = false;
        }
        _Scene_Battle_terminate.call(this);
    };

})();