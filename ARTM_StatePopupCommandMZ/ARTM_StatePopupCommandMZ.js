// *****************************************************
// ARTM_StatePopupCommandMZ.js
// Copyright (c) 2025 Artemis
// This software is released under the MIT license.
// http://opensource.org/licenses/mit-license.php
// ***********************************************************************
// ver.1.00: 新規公開版
// ver.1.01: 0ターン目が表示されてしまう不具合を修正
// ver.1.10: バフ・デバフに対応
// ver.1.20: ターゲット選択画面の非表示オプションを追加
// ***********************************************************************
/*:ja
 * @target MZ
 * @plugindesc 戦闘コマンドにステート確認を追加するMZ専用プラグイン
 * @author Artemis
 *
 * @help 戦闘コマンドにステート確認を追加します。
 * 対象者(味方、敵）を選択すると、対象者のステート状態を一覧表示します。
 *
 * ■ステートのメモ欄
 * 【ステートの説明内容】
 *   ステート一覧で、カーソルを合わせたステートの説明内容を設定します。
 *   メモ欄に記述する書式は下記の通りです。
 *   <SPCMZ_DESC:ここに表示する説明を書きます>
 *
 * 【ステート一覧の除外対象】
 *   ステート一覧から除外します。
 *   メモ欄に記述する書式は下記の通りです。
 *   <SPCMZ_HIDE:>
 *
 * プラグインコマンドはありません。
 *
 * @param cmd_name
 * @type string
 * @text コマンド名
 * @desc コマンド名を設定します。
 * @default ステート確認
 *
 * @param state_turns
 * @type string
 * @text ステートの残りターン
 * @desc ステートの残りターン表示を設定します。
 * %に残りターン数が表示されます。
 * @default 残り%ターン
 *
 * @param turns_font_size
 * @type number
 * @text 残りターンのフォントサイズ
 * @desc 残りターンのフォントサイズを指定します。
 * @default 20
 *
 * @param turns_font_color
 * @type string
 * @text 残りターンのフォントカラー
 * @desc 残りターンのフォントカラーをR,G,B,A形式で指定します。
 * 赤255,緑255,青50,透明度80%の例：「255, 255, 50, 0.8」
 * @default 255, 255, 50, 0.8
 *
 * @param is_disp_icon_pt
 * @type boolean
 * @on 表示する
 * @off 表示しない
 * @text 味方パーティの状態アイコン
 * @desc 味方パーティの状態アイコン表示を設定します。
 * @default true
 *
 * @param is_disp_icon_em
 * @type boolean
 * @on 表示する
 * @off 表示しない
 * @text 敵グループの状態アイコン
 * @desc 敵グループの状態アイコン表示を設定します。
 * @default true
 *
 * @param turns_sort
 * @type select
 * @option ステートID順
 * @value stateId
 * @option 優先度順
 * @value statePrior
 * @text ステートのソート方法を指定
 * @desc ステートのソート方法を指定します。
 * @default stateId
 *
 * @param cmd_type
 * @type select
 * @option パーティコマンド
 * @value typePartyCmd
 * @option アクターコマンド
 * @value typeActorCmd
 * @text コマンドタイプ
 * @desc どのコマンドに追加するかを指定します。
 * @default typePartyCmd
 *
 * @param cmd_pos
 * @type number
 * @min -99
 * @max 99
 * @text コマンド追加の位置
 * @desc コマンドを追加する位置を指定します。
 * (1～：先頭から、-1～：末尾-1から、0は末尾)
 * @default -1
 *
 * @param is_nodisp_bt
 * @type boolean
 * @on 有効
 * @off 無効
 * @text 対象者選択画面の非表示設定
 * @desc 対象者選択画面の非表示設定を設定します。
 * 有効の場合、対象者にフォーカスインすると詳細表示します。
 * @default false
 *
 * @param is_opacity_bt
 * @type boolean
 * @on 透過有り
 * @off 透過無し
 * @text 対象者選択画面後ろの透過
 * @desc 対象者選択画面後ろのウィンドウ透過有無を設定します。
 * @default false
 *
 * @param is_opacity_st
 * @type boolean
 * @on 透過有り
 * @off 透過無し
 * @text ステート一覧画面後ろの透過
 * @desc ステート一覧画面後ろのウィンドウ透過有無を設定します。
 * @default false
 *
 */

// -----------------------------------------------------
// Window_BattleTarget constructor
// -----------------------------------------------------
function Window_BattleTarget() {
    this.initialize(...arguments);
}

(() => {

    const PARAMS = PluginManager.parameters("ARTM_StatePopupCommandMZ");
    const SPCMZ_DESC       = "SPCMZ_DESC";
    const SPCMZ_HIDE       = "SPCMZ_HIDE";
    const CMD_NAME         = PARAMS.cmd_name || "";
    const CMD_TYPE         = PARAMS.cmd_type || "typePartyCmd";
    const CMD_POS          = +(PARAMS.cmd_pos || "-1");
    const STATE_TURNS      = PARAMS.state_turns || "";
    const TURNS_FONT_SIZE  = +(PARAMS.turns_font_size || "20");
    const TURNS_FONT_COLOR = PARAMS.turns_font_color || "255, 255, 50, 0.8";
    const TURNS_SORT       = PARAMS.turns_sort || "";
    const IS_DISP_ICON_PT  = PARAMS.is_disp_icon_pt.toLowerCase() === "true";
    const IS_DISP_ICON_EM  = PARAMS.is_disp_icon_em.toLowerCase() === "true";
    const IS_NODISP_BT     = PARAMS.is_nodisp_bt.toLowerCase() === "true";
    const IS_OPACITY_BT    = PARAMS.is_opacity_bt.toLowerCase() === "true";
    const IS_OPACITY_ST    = PARAMS.is_opacity_st.toLowerCase() === "true";
    const IS_OPACITY       = IS_OPACITY_BT || IS_OPACITY_ST;

    // -----------------------------------------------------
    // Scene_Battle
    // -----------------------------------------------------
    Scene_Battle.prototype.addWindow_Artm = function(window) {
        if (IS_OPACITY !== false) {
            this._windowLayerSpc.addChild(window);
        } else {
            this.addWindow(window);
        }
    };

    const _Scene_Base_createWindowLayer = Scene_Base.prototype.createWindowLayer;
    Scene_Base.prototype.createWindowLayer = function() {
        _Scene_Base_createWindowLayer.call(this);
        if (this instanceof Scene_Battle) {
            if (IS_OPACITY !== false) {
                this._windowLayerSpc = new WindowLayer();
                this._windowLayerSpc.x = this._windowLayer.x;
                this._windowLayerSpc.y = this._windowLayer.y;
                this.addChild(this._windowLayerSpc);
            }
        }
    };

    const _Scene_Battle_createPartyCommandWindow =
        Scene_Battle.prototype.createPartyCommandWindow;
    Scene_Battle.prototype.createPartyCommandWindow = function() {
        _Scene_Battle_createPartyCommandWindow.call(this);
        if (CMD_TYPE === "typePartyCmd") {
            this._partyCommandWindow.setHandler(
                "stpopup",
                this.commandStatePopup_Artm.bind(this)
            );
            this._commandWindowArtm = this._partyCommandWindow;
        }
    };

    const _Scene_Battle_createActorCommandWindow =
        Scene_Battle.prototype.createActorCommandWindow;
    Scene_Battle.prototype.createActorCommandWindow = function() {
        _Scene_Battle_createActorCommandWindow.call(this);
        if (CMD_TYPE === "typeActorCmd") {
            this._actorCommandWindow.setHandler(
                "stpopup",
                this.commandStatePopup_Artm.bind(this)
            );
            this._commandWindowArtm = this._actorCommandWindow;
        }
    };

    Scene_Battle.prototype.commandStatePopup_Artm = function() {
        this.startTargetSelection_Artm();
    };

    Scene_Battle.prototype.startTargetSelection_Artm = function() {
        if (IS_NODISP_BT) {
            this._targetWindowArtm.setStateListWindow_Artm(this._stateListWindowArtm);
            this.showStateListWindow_Artm();
        }
        this._targetWindowArtm.refresh();
        this._targetWindowArtm.show();
        this._targetWindowArtm.select(0);
        this._targetWindowArtm.activate();
        if (IS_OPACITY_BT === false) {
            this._statusWindow.hide();
        }
    };

    Scene_Battle.prototype.showStateListWindow_Artm = function() {
        const target = this._targetWindowArtm.target();
        this._stateListWindowArtm.setTarget(target);
        this._stateListWindowArtm.refresh();
        this._stateListWindowArtm.show();
        this._stateListWindowArtm.activate();
    };

    const _Scene_Battle_createAllWindows =
        Scene_Battle.prototype.createAllWindows;
    Scene_Battle.prototype.createAllWindows = function() {
        _Scene_Battle_createAllWindows.call(this);
        this.createTargetWindow_Artm();
        this.createStateListWindow_Artm();
    };

    Scene_Battle.prototype.createTargetWindow_Artm = function() {
        const rect = this.targetWindowRect_Artm();
        this._targetWindowArtm = new Window_BattleTarget(rect);
        this._targetWindowArtm.setHandler("ok", this.onTargetOk_Artm.bind(this));
        this._targetWindowArtm.setHandler("cancel", this.onTargetCancel_Artm.bind(this));
        this.addWindow_Artm(this._targetWindowArtm);
    };

    Scene_Battle.prototype.targetWindowRect_Artm = function() {
        return (
            !IS_NODISP_BT ? this.enemyWindowRect() :
             new Rectangle(0, 0, 0, 0)
        );
    };

    Scene_Battle.prototype.createStateListWindow_Artm = function() {
        const rect = this.stateListWindowRect_Artm();
        this._stateListWindowArtm = new Window_BattleState(rect);
        this._stateListWindowArtm.setHelpWindow(this._helpWindow);
        this._stateListWindowArtm.setHandler("cancel", this.onStateCancel_Artm.bind(this));
        this.addWindow_Artm(this._stateListWindowArtm);
        BattleManager.setStateListWindow_Artm(this._stateListWindowArtm);
    };

    Scene_Battle.prototype.stateListWindowRect_Artm = function() {
        return this.skillWindowRect();
    };

    const _Scene_Battle_isAnyInputWindowActive =
        Scene_Battle.prototype.isAnyInputWindowActive;
    Scene_Battle.prototype.isAnyInputWindowActive = function() {
        return (
            _Scene_Battle_isAnyInputWindowActive.call(this) ||
            this._targetWindowArtm.active ||
            this._stateListWindowArtm.active
        );
    };

    Scene_Battle.prototype.onTargetOk_Artm = function() {
        if (IS_NODISP_BT) {
            return;
        } else if (IS_OPACITY_ST === false) {
            this._commandWindowArtm.hide();
            this._statusWindow.hide();
        } else {
            this._statusWindow.show();
        }
        this._targetWindowArtm.hide();
        this.showStateListWindow_Artm();
    };

    Scene_Battle.prototype.onTargetCancel_Artm = function() {
        this._targetWindowArtm.hide();
        if (IS_NODISP_BT) {
            this._targetWindowArtm._stateListWindow.hide();
            this._targetWindowArtm._stateListWindow = null;
        }
        this._statusWindow.show();        
        this._commandWindowArtm.show();
        this._commandWindowArtm.activate();
    };

    Scene_Battle.prototype.onStateCancel_Artm = function() {
        this._stateListWindowArtm.hide();
        this._commandWindowArtm.show();
        if (IS_OPACITY_BT === false) {
            this._statusWindow.hide();
        } else {
            this._statusWindow.show();
        }
        this._targetWindowArtm.show();
        this._targetWindowArtm.activate();
    };

    // -----------------------------------------------------
    // Window_BattleTarget
    // -----------------------------------------------------
    Window_BattleTarget.prototype = Object.create(Window_Selectable.prototype);
    Window_BattleTarget.prototype.constructor = Window_BattleTarget;

    Window_BattleTarget.prototype.initialize = function(rect) {
        this._targets = [];
        Window_Selectable.prototype.initialize.call(this, rect);
        this.refresh();
        this.hide();
        this._targetPre = null;
    };

    Window_BattleTarget.prototype.setStateListWindow_Artm = function(window) {
        this._stateListWindow = window;
    };

    Window_BattleTarget.prototype.maxCols = function() {
        return 2;
    };

    Window_BattleTarget.prototype.maxItems = function() {
        return this._targets.length;
    };

    Window_BattleTarget.prototype.target = function() {
        return this._targets[this.index()];
    };

    Window_BattleTarget.prototype.targetIndex = function() {
        const target = this.target();
        return target ? target.index() : -1;
    };

    Window_BattleTarget.prototype.drawItem = function(index) {
        const target = this._targets[index];
        const rect = this.itemLineRect(index);
        if (target.isActor()) {
            this.actorTextColor();
        } else if (target.isEnemy()) {
            this.enemyTextColor();
        } else {
            this.resetTextColor();
        }
        this.drawText(target.name(), rect.x, rect.y, rect.width);
    };

    Window_BattleTarget.prototype.actorTextColor = function() {
        this.changeTextColor(ColorManager.textColor(4));
        this.changeOutlineColor(ColorManager.outlineColor());
    };

    Window_BattleTarget.prototype.enemyTextColor = function() {
        this.changeTextColor(ColorManager.textColor(2));
        this.changeOutlineColor(ColorManager.outlineColor());
    };

    Window_BattleTarget.prototype.show = function() {
        const index = this.index();
        this.refresh();
        this.forceSelect(index === -1 ? 0 : index);
        $gameTemp.clearTouchState();
        Window_Selectable.prototype.show.call(this);
    };

    Window_BattleTarget.prototype.hide = function() {
        Window_Selectable.prototype.hide.call(this);
        $gameParty.select(null);
        $gameTroop.select(null);
    };

    Window_BattleTarget.prototype.refresh = function() {
        this._targets = 
            $gameParty.aliveMembers().concat(
             $gameTroop.aliveMembers()
            );
        Window_Selectable.prototype.refresh.call(this);
    };

    Window_BattleTarget.prototype.select = function(index) {
        Window_Selectable.prototype.select.call(this, index);
        const target = this.target();
        if (target) {
            this.unitChange();
            if (target.isActor()) {
                $gameParty.select(target);
            } else if (target.isEnemy()) {
                $gameTroop.select(target);
            }
        }
    };

    Window_BattleTarget.prototype.unitChange = function() {
        const changedUnit = this.getChangedUnit();
        if (changedUnit === "party" || changedUnit === "troop") {
            this._targetPre.deselect();
        }
        if (IS_NODISP_BT) {
            this._stateListWindow.setTarget(this.target());
        }
        this._targetPre = this.target();
        return changedUnit;
    };

    Window_BattleTarget.prototype.getChangedUnit = function() {
        const target = this.target();
        const targetPre = this._targetPre || target;
        let changedUnit = "";
        if (target.isActor() && targetPre.isEnemy()) {
            changedUnit = "party";
        } else if (target.isEnemy() && targetPre.isActor()) {
            changedUnit = "troop";
        }
        return changedUnit;
    };

    Window_BattleTarget.prototype.processTouch = function() {
        Window_Selectable.prototype.processTouch.call(this);
        if (this.isOpenAndActive()) {
            const target = $gameTemp.touchTarget();
            if (target) {
                if (this._targets.includes(target)) {
                    this.select(this._targets.indexOf(target));
                    if ($gameTemp.touchState() === "click" && !IS_NODISP_BT) {
                        this.processOk();
                    }
                }
                $gameTemp.clearTouchState();
            }
        }
    };

    // -----------------------------------------------------
    // Window_StateList
    // -----------------------------------------------------
    function Window_StateList() {
        this.initialize(...arguments);
    }

    Window_StateList.prototype = Object.create(Window_Selectable.prototype);
    Window_StateList.prototype.constructor = Window_StateList;

    Window_StateList.prototype.initialize = function(rect) {
        Window_Selectable.prototype.initialize.call(this, rect);
        this._target = null;
        this._data = [];
    };

    Window_StateList.prototype.setTarget = function(target) {
        if (this._target !== target) {
            this._target = target;
            this.refresh();
            this.scrollTo(0, 0);
        }
    };

    Window_StateList.prototype.refresh = function() {
        this.makeItemList();
        Window_Selectable.prototype.refresh.call(this);
        this.selectLast();
    };

    Window_StateList.prototype.selectLast = function() {
        const newIndex = this._data.length - 1;
        const index = Math.max(this.index(), 0);
        this.forceSelect(
            this._data.length > 0 ?
            (newIndex < index ? newIndex : index) : -1
        );
    };

    Window_StateList.prototype.target = function() {
        return this._target;
    };

    Window_StateList.prototype.maxCols = function() {
        return 2;
    };

    Window_StateList.prototype.colSpacing = function() {
        return 16;
    };

    Window_StateList.prototype.maxItems = function() {
        return this._data ? this._data.length : 1;
    };

    Window_StateList.prototype.item = function() {
        return this.itemAt(this.index());
    };

    Window_StateList.prototype.itemAt = function(index) {
        return (
            this._data && index >= 0 ? 
            this._data[index] : null
        );
    };

    Window_StateList.prototype.includes = function(item) {
        return (
            item && 
            item.meta[SPCMZ_HIDE] === undefined
        );
    };

    Window_StateList.prototype.makeItemList = function() {
        const target = this._target;
        if (target) {
            this.makeStateItemList();
            this.makeBuffItemList();
        } else {
            this._data = [];
        }
    };

    Window_StateList.prototype.makeStateItemList = function() {
        const target = this._target;
        this._data = target.states().filter(item => {
            return (
                this.includes(item) && 
                !target.isStateExpired(item.id)
            );
        }, this);
        this.sortItems();
    };

    Window_StateList.prototype.makeBuffItemList = function() {
        const target = this._target;
        for (let i = 0, j = 0; i < target._buffs.length; i++) {
            if (target.isBuffOrDebuffAffected(i) && !target.isBuffExpired(i)) {
                this._data.push({
                    "paramId": i,
                    "iconIndex": target.buffIcons()[j++],
                    "name": $dataSystem.terms.params[i]
                });
            }
        }
    };

    Window_StateList.prototype.sortItems = function() {
        if (TURNS_SORT === "stateId") {
            this._data.sort((a, b) => a.id - b.id);
        }
    };

    Window_StateList.prototype.drawItem = function(index) {
        const state = this.itemAt(index);
        if (state) {
            const turnsWidth = this.turnsWidth();
            const rect = this.itemLineRect(index);
            this.changePaintOpacity(true);
            this.drawItemName(state, rect.x, rect.y, rect.width - turnsWidth);
            this.drawStateTurns(state, rect.x, rect.y, rect.width);
            this.changePaintOpacity(1);
        }
    };

    Window_StateList.prototype.turnsWidth = function() {
        const testText = STATE_TURNS.replace("%", "00")
        return this.textWidth(testText);
    };

    Window_StateList.prototype.drawStateTurns = function(state, x, y, width) {
        let turns;
        if (state.id) {
            turns = this._target._stateTurns[state.id];
        } else {
            turns = this._target._buffTurns[state.paramId];
        }
        const turnsText = STATE_TURNS.replace("%", turns);
        const orgFontSize = this.contents.fontSize;
        if (state.autoRemovalTiming !== 0) {
            this.changeTextColor("rgba(" + TURNS_FONT_COLOR + ")");
            this.contents.fontSize = TURNS_FONT_SIZE;
            this.drawText(turnsText, x, y, width, "right");
            this.contents.fontSize = orgFontSize;
        }
    };

    Window_StateList.prototype.updateHelp = function() {
        const item = this.item() || new Game_Item();
        item.description = this.makeDescription(item);
        this.setHelpWindowItem(item);
    };

    Window_StateList.prototype.makeDescription = function(item) {
        if (this._data.length > 0) {
            if (item.meta) {
                return item.meta[SPCMZ_DESC] || "";
            } else {
                return "";
            }
        } else {
            return "";
        }
    };

    // -----------------------------------------------------
    // Window_BattleState
    // -----------------------------------------------------
    function Window_BattleState() {
        this.initialize(...arguments);
    }

    Window_BattleState.prototype = Object.create(Window_StateList.prototype);
    Window_BattleState.prototype.constructor = Window_BattleState;

    Window_BattleState.prototype.initialize = function(rect) {
        Window_StateList.prototype.initialize.call(this, rect);
        this.hide();
    };

    Window_BattleState.prototype.show = function() {
        this.selectLast();
        this.showHelpWindow();
        Window_StateList.prototype.show.call(this);
    };

    Window_BattleState.prototype.hide = function() {
        this.hideHelpWindow();
        Window_StateList.prototype.hide.call(this);
    };

    // -----------------------------------------------------
    // Window_PartyCommand
    // -----------------------------------------------------
    function addStatePopupCommand(list, length) {
        const cmdPos = CMD_POS.clamp(-length + 1, length);
        if (cmdPos > 0 && cmdPos < length) {
            list.splice(cmdPos - 1, 0, list[length - 1]);
            list.pop();
        } else if (cmdPos < 0) {
            list.splice(length + cmdPos - 1, 0, list[length - 1]);
            list.pop();
        }
    }

    const _Window_PartyCommand_makeCommandList =
        Window_PartyCommand.prototype.makeCommandList;
    Window_PartyCommand.prototype.makeCommandList = function() {
        _Window_PartyCommand_makeCommandList.call(this);
       if (CMD_TYPE === "typePartyCmd") {
           this.addStatePopupCommand();
       }
    };

    Window_PartyCommand.prototype.addStatePopupCommand = function() {
        this.addCommand(CMD_NAME, "stpopup", true);
        addStatePopupCommand(this._list, this._list.length);
    };

    // -----------------------------------------------------
    // Window_ActorCommand
    // -----------------------------------------------------
    const _Window_ActorCommand_makeCommandList =
        Window_ActorCommand.prototype.makeCommandList;
    Window_ActorCommand.prototype.makeCommandList = function() {
        _Window_ActorCommand_makeCommandList.call(this);
        if (CMD_TYPE === "typeActorCmd") {
            if (this._actor) {
                this.addStatePopupCommand();
            }
        }
    };

    Window_ActorCommand.prototype.addStatePopupCommand = function() {
        this.addCommand(CMD_NAME, "stpopup", true);
        addStatePopupCommand(this._list, this._list.length);
    };

    // -----------------------------------------------------
    // BattleManager
    // -----------------------------------------------------
    BattleManager.setStateListWindow_Artm = function(window) {
        this._stateListWindowArtm = window
    }

    BattleManager.getStateListWindow_Artm = function() {
        return this._stateListWindowArtm;
    }

    // -----------------------------------------------------
    // Game_Battler
    // -----------------------------------------------------
    Game_Battler.prototype.refreshStateListWindow = function() {
        const stateListWindow = BattleManager.getStateListWindow_Artm();
        if (stateListWindow && stateListWindow.visible) {
            if (this === stateListWindow.target()) {
                stateListWindow.refresh();
            }
        }
    };

    const _Game_Battler_onTurnEnd = Game_Battler.prototype.onTurnEnd;
    Game_Battler.prototype.onTurnEnd = function() {
        _Game_Battler_onTurnEnd.call(this);
        this.refreshStateListWindow();
    };

    const _Game_Battler_addState = Game_Battler.prototype.addState;
    Game_Battler.prototype.addState = function(stateId) {
        _Game_Battler_addState.call(this, stateId);
        this.refreshStateListWindow();
    };

    const _Game_Battler_removeState = Game_Battler.prototype.removeState;
    Game_Battler.prototype.removeState = function(stateId) {
        _Game_Battler_removeState.call(this, stateId);
        this.refreshStateListWindow();
    };

    // -----------------------------------------------------
    // Window_StatusBase
    // -----------------------------------------------------
    const _Window_StatusBase_placeStateIcon =
        Window_StatusBase.prototype.placeStateIcon;
    Window_StatusBase.prototype.placeStateIcon = function(actor, x, y) {
        if (IS_DISP_ICON_PT === false) {
            return;
        }
        _Window_StatusBase_placeStateIcon.call(this, actor, x, y);
    };

    // -----------------------------------------------------
    // Sprite_Enemy
    // -----------------------------------------------------
    const _Sprite_Enemy_createStateIconSprite =
        Sprite_Enemy.prototype.createStateIconSprite;
    Sprite_Enemy.prototype.createStateIconSprite = function() {
        _Sprite_Enemy_createStateIconSprite.call(this);
        if (IS_DISP_ICON_EM === false) {
            this.children.pop();
        }
    };
    
})();