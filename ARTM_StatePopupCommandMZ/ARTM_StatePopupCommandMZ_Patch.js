// *****************************************************
// ARTM_StatePopupCommandMZ_Patch.js
// Copyright (c) 2025 Artemis
// This software is released under the MIT license.
// http://opensource.org/licenses/mit-license.php
// *****************************************************
// ver.1.00: 新規公開版
// *************************
/*:ja
 * @target MZ
 * @plugindesc 外部プラグイン導入パッチ
 * @author Artemis
 * @base ARTM_StatePopupCommandMZ
 * @orderAfter ARTM_StatePopupCommandMZ
 *
 * @help 1．木星ペンギン様作「MPP_Pseudo3DBattle.js」と併用する場合のパッチ
 *
 */
 
(() => {

    // -----------------------------------------------------
    // Scene_Battle
    // -----------------------------------------------------
    const _Scene_Battle_startTargetSelection_Artm = Scene_Battle.prototype.startTargetSelection_Artm;
    Scene_Battle.prototype.startTargetSelection_Artm = function() {
        _Scene_Battle_startTargetSelection_Artm.call(this);
        BattleManager.callPseudo3dMethod("targeting", $gameParty.members());
    };

    const _Scene_Battle_onTargetCancel_Artm = Scene_Battle.prototype.onTargetCancel_Artm;
    Scene_Battle.prototype.onTargetCancel_Artm = function() {
       _Scene_Battle_onTargetCancel_Artm.call(this);
       BattleManager.callPseudo3dMethod("endTargeting");
    };

    // -----------------------------------------------------
    // Window_BattleTarget
    // -----------------------------------------------------
    const _Window_BattleTarget_unitChange = Window_BattleTarget.prototype.unitChange;
    Window_BattleTarget.prototype.unitChange = function() {
        const unit = _Window_BattleTarget_unitChange.call(this);
        if(unit === "party") {
            BattleManager.callPseudo3dMethod(
                "targeting", $gameParty.members()
            );
        } else if (unit === "troop") {
            BattleManager.callPseudo3dMethod(
                "targeting", $gameTroop.aliveMembers()
            );
        }
    };
  
})();