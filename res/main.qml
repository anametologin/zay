import QtQuick 2.15
import org.kde.plasma.core as PlasmaCore
import org.kde.plasma.components as Plasma
import org.kde.plasma.plasma5support as Plasma5Support
import org.kde.kwin 3.0
import org.kde.taskmanager as TaskManager
import "../code/script.js" as K

Item {
    id: scriptRoot
    property var popupComponent: null
    property var popups: []

    TaskManager.ActivityInfo {
        id: activityInfo
    }

    Plasma5Support.DataSource {
        id: mousePoller
        engine: 'executable'
    }

    function show(hops) {
        if (popupComponent == null){
            // console.log(`show function: hops=${hops}`);
            popupComponent = Qt.createComponent("popup.qml");
            // console.log(`component.status=${popupComponent.status}`)
            if (popupComponent.status == Component.Ready){
                finishCreation(hops);
            }else if (popupComponent.status == Component.Error) {
                // Error Handling
                console.log("Error loading component:", popupComponent.errorString());
            }
            else popupComponent.statusChanged.connect(()=>finishCreation(hops));
        }
        else finishCreation(hops);

    }

    function finishCreation(hops){
        if (popups.length  !== 0){ popups = []}
        for (var i = 0; i < hops.length; i++) {
            var title = hops[i][0];
            var x = hops[i][1];
            var y = hops[i][2];
            var obj = popupComponent.createObject(scriptRoot, {});
            obj.show(title, x, y, 6000);
            popups.push(obj);
        };

    }

    function hidePopups(){
        for (var i = 0; i<popups.length; i++) {
            popups[i].hide();
        }
    }

    // Loader {
    //     id: popupDialog
    //     source: "popup.qml"
    //
    //     // function show(text, p) {
    //     //     // var area = Workspace.clientArea(KWin.FullScreenArea, Workspace.activeScreen, Workspace.currentDesktop);
    //     //     this.item.show(text, p, 5000);
    //     // }
    // }

    Component.onCompleted: {
        console.log("Zay: starting the script");
        const api = {
            "workspace": Workspace,
            "kwin": KWin,
            "shortcuts": shortcutsLoader.item,
            "dbus": dbusLoader.item
        };

        (new K.KWinDriver(api)).main();
    }
    Loader {
        id: shortcutsLoader;

        source: "shortcuts.qml";
    }

    Loader {
        id: dbusLoader;
        source: "dbus.qml";
    }
}
