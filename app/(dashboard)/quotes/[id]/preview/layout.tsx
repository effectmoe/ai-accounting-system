export default function PreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // プレビューページ専用のシンプルなレイアウト
  // ナビゲーションバーやサイドバーなし
  return (
    <>
      {children}
    </>
  );
}