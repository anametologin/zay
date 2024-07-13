import QtQuick;
import org.kde.kwin;

Item {
    id: shortcuts;

    function getShowHops() {
        return showHops;
    }
    ShortcutHandler {
        id: showHops;

        name: "ZayShowHops";
        text: "Zay: Show hops spots";
        sequence: "Meta+Shift+h";
    }
}
