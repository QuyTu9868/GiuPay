// Trang lỗi tùy biến của Pages Router - gửi lỗi getInitialProps/SSR về Sentry rồi
// hiển thị trang lỗi mặc định của Next. Cần thiết vì Pages Router không tự báo Sentry.
import * as Sentry from "@sentry/nextjs";
import NextErrorComponent from "next/error";
import type { NextPageContext } from "next";

type Props = { statusCode: number };

function CustomError({ statusCode }: Props) {
  return <NextErrorComponent statusCode={statusCode} />;
}

CustomError.getInitialProps = async (ctx: NextPageContext) => {
  await Sentry.captureUnderscoreErrorException(ctx);
  return NextErrorComponent.getInitialProps(ctx);
};

export default CustomError;
