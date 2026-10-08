// ===================================================
// ARTM_InfluenceActorFaceMZ_SideBySidePatch
// Copyright (c) 2026
// This software is released under the MIT license.
// http://opensource.org/licenses/mit-license.php
// ===================================================
// [Version]
// 1.0.0 初版
// ===================================================
/*:ja
 * @target MZ
 * @plugindesc 【競合対策】ARTMフェイス画像 × NUUNステート横並び表示パッチ
 * @author Artemis
 * @base ARTM_InfluenceActorFaceMZ
 * @orderAfter ARTM_InfluenceActorFaceMZ
 * @orderAfter NUUN_StateIconSideBySide
 * 
 * @help ARTM_InfluenceActorFaceMZ_SideBySidePatch.js
 * 
 * ■ プラグインの目的・対象
 * 「ARTM_InfluenceActorFaceMZ」(Artemis様) と
 * 「NUUN_StateIconSideBySide」(NUUN様) を併用した際に、
 * HPが0になった時や戦闘不能ステートが付与された瞬間に
 * フェイス画像が切り替わらなくなる競合を解消します。
 * 
 * ■ プラグイン管理での配置順（重要）
 * 必ず以下の順序（当プラグインが一番下）になるように配置してください。
 * 1. NUUN_Base
 * 2. NUUN_StateIconSideBySide
 * 3. ARTM_InfluenceActorFaceMZ
 * 4. ARTM_InfluenceActorFaceMZ_SideBySidePatch（当プラグイン）
 * 
 */

(() => {

    function refreshActorFaceDirect(actor) {
        if (!actor || !SceneManager._scene) return;
        const targets = [
            SceneManager._scene._statusWindow,
            SceneManager._scene._actorWindow
        ].filter(target => target && target.contents && typeof target.faceRect === "function");
        if (targets.length === 0) return;
        const key = actor.faceName();
        if (!key) return;
        const bitmap = ImageManager.loadFace(key);
        bitmap.addLoadListener(() => {
            const faceIndex = actor.faceIndex();
            const pw = ImageManager.faceWidth;
            const ph = ImageManager.faceHeight;
            for (const target of targets) {
                const rect = target.faceRect(actor.index());
                if (!rect) continue;
                const width = rect.width || pw;
                const height = rect.height || ph;
                const sw = Math.min(width, pw);
                const sh = Math.min(height, ph);
                const dx = Math.floor(rect.x + Math.max(width - pw, 0) / 2);
                const dy = Math.floor(rect.y + Math.max(height - ph, 0) / 2);
                const sx = (faceIndex % 4) * pw + (pw - sw) / 2;
                const sy = Math.floor(faceIndex / 4) * ph + (ph - sh) / 2;
                target.contents.clearRect(rect.x, rect.y, sw, sh);
                target.contents.blt(bitmap, sx, sy, sw, sh, dx, dy);
            }
        });
    }

    function checkAndRefreshActor(actor) {
        if (!actor || !actor.checkFaceChange_Artm) return;
        actor.checkFaceChange_Artm();
        if (actor._needsFaceChanging) {
            actor._needsFaceChanging = false;
            refreshActorFaceDirect(actor);
        }
    }

    const _Game_Actor_refresh = Game_Actor.prototype.refresh;
    Game_Actor.prototype.refresh = function() {
        _Game_Actor_refresh.apply(this, arguments);
        if ($gameParty && $gameParty.inBattle()) {
            checkAndRefreshActor(this);
        }
    };

    if (typeof Sprite_SideBySideStateIcon !== "undefined") {
        const _Sprite_SideBySideStateIcon_updateIcon = Sprite_SideBySideStateIcon.prototype.updateIcon;
        Sprite_SideBySideStateIcon.prototype.updateIcon = function() {
            _Sprite_SideBySideStateIcon_updateIcon.apply(this, arguments);
            if ($gameParty && $gameParty.inBattle() && this._battler && this._battler.isActor()) {
                checkAndRefreshActor(this._battler);
            }
        };
    }

})();