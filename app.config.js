/* app.json に、ビルド時だけ渡す値を足す。
   google-services.json は公開リポジトリに置けないので、EAS のファイル変数
   GOOGLE_SERVICES_JSON から受け取る（手元で動かすときは同じフォルダのファイルを使う）。 */
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? "./google-services.json",
  },
});
