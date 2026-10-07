// ===================================================
// ARTM_SkillOtherTargetMZ
// Copyright (c) 2021 Artemis
// This software is released under the MIT license.
// http://opensource.org/licenses/mit-license.php
// -------------
// [Version]
// 1.0.0 初版
// ====================================================
/*:ja
 * @target MZ
 * @plugindesc スキル範囲を詠唱者以外に変更するMZ専用プラグイン
 * @author Artemis
 *
 * @help ARTM_SkillOtherTargetMZ
 * スキル範囲を詠唱者以外に変更するMZ専用プラグインです。
 *
 *-------------------------------------------------
 * メモ欄タグは以下の通りです。
 *-------------------------------------------------
 * ★スキルのメモ欄任意行に下記タグを記述して下さい。
 *   <SOT_STATE:VALID>
 *   上記記述があるスキルは、範囲が下記の通りに変更されます。
 *   ☆味方単体・・・詠唱者以外の味方を選択し対象とする（敵の場合は味方ランダム）
 *   ☆味方全体・・・詠唱者以外の味方全員を対象とする
 *   ☆敵味方全体・・詠唱者以外の敵味方全員を対象とする
 *
 * プラグインコマンドはありません。
 *
 */
 
(() => {

    const TAG_NAME = "SOT_STATE";
    const TAG_VALUE = "VALID";

    const _Game_Temp_initialize = Game_Temp.prototype.initialize;
    Game_Temp.prototype.initialize = function() {
        _Game_Temp_initialize.call(this);
        this._isExceptSOT = false;
        this._statesSOT = [false, false, false, false];
        this._listSOT = [];
    };

    Game_Temp.prototype.getExceptSOT = function() {
        return !!this._isExceptSOT;
    };

    Game_Temp.prototype.setExceptSOT = function(state) {
        this._isExceptSOT = state;
    };

    Game_Temp.prototype.getStatesSOT = function(index) {
        return !!this._statesSOT[index];
    };

    Game_Temp.prototype.setStatesSOT = function(index, state) {
        this._statesSOT[index] = state;
    };

    Game_Temp.prototype.listSOT = function() {
        return this._listSOT;
    };

    Game_Temp.prototype.doListExceptSOT = function(except) {
        this._listSOT = this._listSOT.filter(v => v !== except);
        if (this._listSOT.length === 0) {
            this.setStatesSOT(1, false);
        }
    };

    Game_Action.prototype.isSOT = function() {
        return(
            DataManager.isSkill(this.item()) &&
            this.item().meta[TAG_NAME]
        );
    };

    const _Game_Action_makeTargets = Game_Action.prototype.makeTargets;
    Game_Action.prototype.makeTargets = function() {
        const subject = this.subject();
        const isSOT = this.isSOT();
        let targets = this.makeTargetsSOT(subject, isSOT);
        if (!isSOT) {
            return targets
        } else if (!this.isForUser() && this.isForOne()) {
            targets = this.makeTargetsProcSOT(targets);
        } else if (this.isForAll()) {
            targets = targets.filter(t => {
                return t !== subject;
            }, this);
        } else {
            targets = [];
        }
        return targets
    };

    Game_Action.prototype.makeTargetsSOT = function(subject, isSOT) {
        let targets, prevExcept, members, index;
        if (!!isSOT && 
            $gameTemp.getStatesSOT(1) &&
            $gameTemp.listSOT().includes(subject)) {
             prevExcept = $gameTemp.getExceptSOT();
             $gameTemp.setExceptSOT(false);
             members = $gameParty.members();
             index = members.indexOf(subject);
             $gameTemp.setExceptSOT(true);
             $gameTemp.doListExceptSOT(subject);
             if (index < this._targetIndex) {
                 this._targetIndex--;
             }
             targets = _Game_Action_makeTargets.call(this);
             $gameTemp.setExceptSOT(prevExcept);
        } else {
            targets = _Game_Action_makeTargets.call(this);
        }
        return targets;
   };

    Game_Action.prototype.makeTargetsProcSOT = function(targets) {
        if (this.friendsUnit()._actors) {
            return this.makeTargetsActorProcSOT() || targets;
        } else if (this.friendsUnit()._enemies) {
            return this.makeTargetsEnemyProcSOT();
        } else {
            return [];
        }
    }

    Game_Action.prototype.makeTargetsActorProcSOT = function() {
        return null;
    }

    Game_Action.prototype.makeTargetsEnemyProcSOT = function() {
        const unit = this.friendsUnit();
        const subject = this.subject()
        const enemiesSave = [...unit._enemies];
        let targets;
        unit._enemies = enemiesSave.filter(a => {
            return a !== subject;
        });
        targets = [unit.randomTarget()]
        unit._enemies = enemiesSave
        return targets;
    }

    const _Game_Party_battleMembers = Game_Party.prototype.battleMembers;
    Game_Party.prototype.battleMembers = function() {
        const members = _Game_Party_battleMembers.call(this);
        if ($gameTemp.getExceptSOT()) {
            let subject;
            if ($gameTemp.getStatesSOT(0)) {
                subject = BattleManager._currentActor;
            } else {
                subject = BattleManager._subject;
            }
            return(
                !subject ? members :
                members.filter(bm => bm !== subject)
            );
        }
        return members;
    };

    const _Game_Party_allMembers = Game_Party.prototype.allMembers;
    Game_Party.prototype.allMembers = function() {
        const members = _Game_Party_allMembers.call(this);
        if ($gameTemp.getStatesSOT(2)) {
            const scene = SceneManager._scene;
            const actor = scene._statusWindow._actor;
            return members.filter(t => t !== actor);
        }
        return members;
    };

    const _Spriteset_Battle_updateActors = Spriteset_Battle.prototype.updateActors;
    Spriteset_Battle.prototype.updateActors = function() {
        const prevExcept = $gameTemp.getExceptSOT();
        $gameTemp.setExceptSOT(false);
        _Spriteset_Battle_updateActors.call(this);
        $gameTemp.setExceptSOT(prevExcept);
    };

    const _Scene_ItemBase_showActorWindow = Scene_ItemBase.prototype.showActorWindow;
    Scene_ItemBase.prototype.showActorWindow = function() {
        if (DataManager.isSkill(this.item()) &&
            this.item().meta[TAG_NAME]) {
             $gameTemp.setStatesSOT(2, true);
             this._actorWindow.refresh();
        }
        _Scene_ItemBase_showActorWindow.call(this);
    };

    const _Scene_ItemBase_hideActorWindow = Scene_ItemBase.prototype.hideActorWindow;
    Scene_ItemBase.prototype.hideActorWindow = function() {
        if ($gameTemp.getStatesSOT(2)) {
            $gameTemp.setStatesSOT(2, false);
        }
        _Scene_ItemBase_hideActorWindow.call(this);
    };

    const _Game_BattlerBase_meetsSkillConditions = Game_BattlerBase.prototype.meetsSkillConditions;
    Game_BattlerBase.prototype.meetsSkillConditions = function(skill) {
        if (skill.meta[TAG_NAME]) {
            let length;
            if ($gameParty.inBattle()) {
                const prevState = $gameTemp.getStatesSOT(0);
                const prevExcept =$gameTemp.getExceptSOT()
                $gameTemp.setStatesSOT(0, true);
                $gameTemp.setExceptSOT(true);
                length = $gameParty.battleMembers().length;
                $gameTemp.setStatesSOT(0, prevState);
                $gameTemp.setExceptSOT(prevExcept);
            } else {
                const prevState = $gameTemp.getStatesSOT(2);
                $gameTemp.setStatesSOT(2, true);
                length = $gameParty.allMembers().length;
                $gameTemp.setStatesSOT(2, prevState);
            }
            return length > 0;
        }
        return _Game_BattlerBase_meetsSkillConditions.call(this, skill);
    };

    const _Scene_Battle_onActorOk = Scene_Battle.prototype.onActorOk;
    Scene_Battle.prototype.onActorOk = function() {
        if ($gameTemp.getExceptSOT()) {
            $gameTemp.setExceptSOT(false);
            const members = $gameParty.battleMembers();
            const actor = BattleManager.actor();
            const index = members.indexOf(actor);
            $gameTemp.setStatesSOT(1, true);
            $gameTemp.listSOT().push(actor);
            if (!$gameTemp.getStatesSOT(3)) {
                if (index <= this._actorWindow.index()) {
                    this._actorWindow._index++;
                }
            } else {
                $gameTemp.setStatesSOT(3, false);
            }
        }
        _Scene_Battle_onActorOk.call(this);
    };

    const _Scene_Battle_onActorCancel= Scene_Battle.prototype.onActorCancel;
    Scene_Battle.prototype.onActorCancel = function() {
        _Scene_Battle_onActorCancel.call(this);
        if ($gameTemp.getExceptSOT()) {
            $gameTemp.setExceptSOT(false);
        }
    };

    const _Scene_Battle_onSkillOk = Scene_Battle.prototype.onSkillOk;
    Scene_Battle.prototype.onSkillOk = function() {
        const skill = this._skillWindow.item();
        const action = BattleManager.inputtingAction();
        if (skill.meta[TAG_NAME]) {
            action.setSkill(skill.id);
            if (action.needsSelection()) {
                $gameTemp.setExceptSOT(true);
                BattleManager.actor().setLastBattleSkill(skill);
                this.onSelectAction();
                return;
            }
        }
        _Scene_Battle_onSkillOk.call(this);
    };

    const _Window_BattleStatus_actor = Window_BattleStatus.prototype.actor;
    Window_BattleStatus.prototype.actor = function(index) {
        if ($gameTemp.getExceptSOT()) {
            $gameTemp.setStatesSOT(0, true);
            const actor = _Window_BattleStatus_actor.call(this, index);
            $gameTemp.setStatesSOT(0, false);
            return actor;

        }
        return _Window_BattleStatus_actor.call(this, index);;
    };

    const _Window_BattleStatus_maxItems = Window_BattleStatus.prototype.maxItems;
    Window_BattleStatus.prototype.maxItems = function() {
        if ($gameTemp.getExceptSOT()) {
            $gameTemp.setStatesSOT(0, true);
            const maxItems = _Window_BattleStatus_maxItems.call(this);
            $gameTemp.setStatesSOT(0, false);
            return maxItems;
        }
        return _Window_BattleStatus_maxItems.call(this);
    };

    // overridable
    const _Window_BattleActor_processTouch = Window_BattleActor.prototype.processTouch;
    Window_BattleActor.prototype.processTouch = function() {
        if (!$gameTemp.getExceptSOT()) {
            _Window_BattleActor_processTouch.call(this);
            return;
        }
        Window_BattleStatus.prototype.processTouch.call(this);
        if (this.isOpenAndActive()) {
            const target = $gameTemp.touchTarget();
            if (target) {
                const _members = $gameParty.battleMembers();
                const index = _members.indexOf(target);
                const subject = BattleManager._currentActor;
                const members = _members.filter(bm => {
                    return bm !== subject;
                });
                if (members.includes(target)) {
                    this.select(members.indexOf(target));
                    if ($gameTemp.touchState() === "click") {
                        if (this._index < index) {
                            this._index++;
                            $gameTemp.setStatesSOT(3, true);
                        }
                        this.processOk();
                    }
                }
                $gameTemp.clearTouchState();
            }
        }
    };

})();