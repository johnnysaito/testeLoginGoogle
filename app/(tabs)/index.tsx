import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View, Image, Button, Platform } from "react-native";
import * as Google from "expo-auth-session/providers/google";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as AuthSession from "expo-auth-session";

// expo add expo-auth-session expo-random expo-dev-client
// expo add @react-native-async-storage/async-storage

/*
  For testing expo-auth-session on iOS we need a standalone app 
  which is why we install expo-dev-client
  
  If you don't have eas installed then install using the following command:
  npm install -g eas-cli

  eas login
  eas build:configure

  Build for local development on iOS or Android:
  eas build -p ios --profile development --local
  OR
  eas build -p android --profile development --local

  May need to install the following to build locally (which allows debugging)
  npm install -g yarn
  brew install fastlane

  After building install on your device:
  For iOS (simulator): https://docs.expo.dev/build-reference/simulators/
  For Android: https://docs.expo.dev/build-reference/apk/

  Run on installed app:
  expo start --dev-client
*/

export default function App() {
  const [userInfo, setUserInfo] = useState();
  const [auth, setAuth] = useState();
  const [requireRefresh, setRequireRefresh] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId:
      "240935511186-o0fki68326e5fb1c3tb7t7q2t0jlc8o8.apps.googleusercontent.com",
    iosClientId:
      "240935511186-3pidrpobjpjg8br3gtir0cgmn8ptpovh.apps.googleusercontent.com",
    expoClientId:
      "240935511186-otf58tci8uthbekrk16j1jiu8isvchh3.apps.googleusercontent.com",
  });

  useEffect(() => {
    console.log(response);
    if (response?.type === "success") {
      setAuth(response.authentication);

      const persistAuth = async () => {
        await AsyncStorage.setItem(
          "auth",
          JSON.stringify(response.authentication)
        );
      };
      persistAuth();
    }
  }, [response]);

  useEffect(() => {
    const getPersistedAuth = async () => {
      const jsonValue = await AsyncStorage.getItem("auth");
      if (jsonValue != null) {
        const authFromJson = JSON.parse(jsonValue);
        setAuth(authFromJson);
        console.log(authFromJson);

        setRequireRefresh(
          !AuthSession.TokenResponse.isTokenFresh({
            expiresIn: authFromJson.expiresIn,
            issuedAt: authFromJson.issuedAt,
          })
        );
      }
    };
    getPersistedAuth();
  }, []);

  const getUserData = async () => {
    let userInfoResponse = await fetch(
      "https://www.googleapis.com/userinfo/v2/me",
      {
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      }
    );

    userInfoResponse.json().then((data) => {
      console.log(data);
      setUserInfo(data);
    });
  };

  const showUserData = () => {
    if (userInfo) {
      return (
        <View style={styles.userInfo}>
          <Image source={{ uri: userInfo.picture }} style={styles.profilePic} />
          <Text>Welcome {userInfo.name}</Text>
          <Text>{userInfo.email}</Text>
        </View>
      );
    }
  };

  const getClientId = () => {
    if (Platform.OS === "ios") {
      return "240935511186-3pidrpobjpjg8br3gtir0cgmn8ptpovh.apps.googleusercontent.com";
    } else if (Platform.OS === "android") {
      return "240935511186-o0fki68326e5fb1c3tb7t7q2t0jlc8o8.apps.googleusercontent.com";
    } else {
      console.log("Invalid platform - not handled");
    }
  };

  const refreshToken = async () => {
    const clientId = getClientId();
    console.log(auth);
    const tokenResult = await AuthSession.refreshAsync(
      {
        clientId: clientId,
        refreshToken: auth.refreshToken,
      },
      {
        tokenEndpoint: "https://www.googleapis.com/oauth2/v4/token",
      }
    );

    tokenResult.refreshToken = auth.refreshToken;

    setAuth(tokenResult);
    await AsyncStorage.setItem("auth", JSON.stringify(tokenResult));
    setRequireRefresh(false);
  };

  if (requireRefresh) {
    return (
      <View style={styles.container}>
        <Text>Token requires refresh...</Text>
        <Button title="Refresh Token" onPress={refreshToken} />
      </View>
    );
  }

  const logout = async () => {
    await AuthSession.revokeAsync(
      {
        token: auth.accessToken,
      },
      {
        revocationEndpoint: "https://oauth2.googleapis.com/revoke",
      }
    );

    setAuth(undefined);
    setUserInfo(undefined);
    await AsyncStorage.removeItem("auth");
  };

  return (
    <View style={styles.container}>
      {showUserData()}
      <Button
        title={auth ? "Get User Data" : "Login"}
        onPress={
          auth
            ? getUserData
            : () => promptAsync({ useProxy: false, showInRecents: true })
        }
      />
      {auth ? <Button title="Logout" onPress={logout} /> : undefined}
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  profilePic: {
    width: 50,
    height: 50,
  },
  userInfo: {
    alignItems: "center",
    justifyContent: "center",
  },
});
