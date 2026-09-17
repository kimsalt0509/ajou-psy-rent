// 일회성 마이그레이션 API는 보안상 비활성화되었습니다. (폴더째 삭제해도 됩니다)
export function POST() {
  return Response.json({ error: "더 이상 사용하지 않는 기능입니다." }, { status: 410 });
}
