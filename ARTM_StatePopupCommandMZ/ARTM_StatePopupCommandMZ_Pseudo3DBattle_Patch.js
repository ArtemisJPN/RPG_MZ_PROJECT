// *****************************************************
// ARTM_StatePopupCommandMZ_Pseudo3DBattle_Patch.js
// Copyright (c) 2025 Artemis
// This software is released under the MIT license.
// http://opensource.org/licenses/mit-license.php
// *****************************************************
// ver.1.00: 新規公開版
// *************************
/*:ja
 * @target MZ
 * @plugindesc MPP_Pseudo3DBattle導入パッチ
 * @author Artemis
 *
 * @help 「ARTM_StatePopupCommandMZ.js」で木星ペンギン様作「MPP_Pseudo3DBattle.js」を
 * 導入する際のパッチです。
 * プラグインリストで、「ARTM_StatePopupCommandMZ.js」の下に置いて下さい。
 *
 */
 
(() => {

    // -----------------------------------------------------
    // Scene_Battle
    // -----------------------------------------------------
    const _Scene_Battle_startTargetSelection = Scene_Battle.prototype.startTargetSelection;
    Scene_Battle.prototype.startTargetSelection = function() {
        _Scene_Battle_startTargetSelection.call(this);
        BattleManager.callPseudo3dMethod("targeting", $gameParty.members());
    };

    const _Scene_Battle_onTargetCancel = Scene_Battle.prototype.onTargetCancel;
    Scene_Battle.prototype.onTargetCancel = function() {
       _Scene_Battle_onTargetCancel.call(this);
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