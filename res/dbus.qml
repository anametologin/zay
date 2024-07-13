import QtQuick;
import org.kde.kwin;

Item {
    id: dbus;

    function getDbusInitAction() {
        return dbusInitAction;
  }

    DBusCall {
        id: dbusInitAction;

        service: "org.zay.KeyPressed";
        path: "/org/zay/KeyPressed";
        dbusInterface: "org.zay.KeyPressed1";
        method: "InitAction";
    }

    function getDbusKeySeq() {
        return dbusKeySeq;
  }

    DBusCall {
        id: dbusKeySeq;

        service: "org.zay.KeyPressed";
        path: "/org/zay/KeyPressed";
        dbusInterface: "org.zay.KeyPressed1";
        method: "GetKeySeq";
    }
}
