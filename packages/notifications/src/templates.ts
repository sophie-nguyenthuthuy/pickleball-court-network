/**
 * All notification copy lives here so product can edit it without touching
 * call sites. Strings are Vietnamese-first; English is the fallback.
 */
import { formatVnd } from '@pcn/core';

export type TemplateId =
  | 'booking.confirmed'
  | 'booking.reminder_24h'
  | 'booking.reminder_2h'
  | 'booking.cancelled'
  | 'booking.refunded'
  | 'otp.login'
  | 'ladder.match_recorded'
  | 'ladder.weekly_summary'
  | 'tournament.registration_open'
  | 'tournament.bracket_published'
  | 'tournament.match_scheduled';

export interface TemplatePayload {
  bookingCode?: string;
  venueName?: string;
  courtName?: string;
  startAt?: string;
  durationMinutes?: number;
  priceVnd?: bigint;
  refundVnd?: bigint;
  otpCode?: string;
  ladderName?: string;
  tournamentName?: string;
  detailsUrl?: string;
  opponent?: string;
  scheduledAt?: string;
}

export const render = (id: TemplateId, p: TemplatePayload): { title: string; body: string } => {
  switch (id) {
    case 'booking.confirmed':
      return {
        title: 'Đặt sân thành công',
        body: `Mã ${p.bookingCode}: ${p.venueName} · ${p.courtName} · ${p.startAt} (${p.durationMinutes} phút). Tổng ${formatVnd(p.priceVnd ?? 0n)}.`,
      };
    case 'booking.reminder_24h':
      return {
        title: 'Lịch chơi ngày mai',
        body: `Đừng quên: ${p.venueName} · ${p.courtName} lúc ${p.startAt}.`,
      };
    case 'booking.reminder_2h':
      return {
        title: 'Sắp đến giờ chơi',
        body: `${p.venueName} · ${p.courtName} lúc ${p.startAt} — 2 giờ nữa.`,
      };
    case 'booking.cancelled':
      return {
        title: 'Đã huỷ đặt sân',
        body: `Mã ${p.bookingCode} đã được huỷ.`,
      };
    case 'booking.refunded':
      return {
        title: 'Đã hoàn tiền',
        body: `Đã hoàn ${formatVnd(p.refundVnd ?? 0n)} cho ${p.bookingCode}.`,
      };
    case 'otp.login':
      return {
        title: 'Mã xác thực PCN',
        body: `Mã xác thực của bạn là ${p.otpCode}. Hiệu lực trong 5 phút. Không chia sẻ mã này.`,
      };
    case 'ladder.match_recorded':
      return {
        title: 'Trận đấu đã được ghi nhận',
        body: `Bạn vừa thi đấu trên bảng xếp hạng ${p.ladderName}. Xem ngay.`,
      };
    case 'ladder.weekly_summary':
      return {
        title: 'Tổng kết tuần',
        body: `Bảng xếp hạng ${p.ladderName} đã cập nhật.`,
      };
    case 'tournament.registration_open':
      return {
        title: 'Mở đăng ký giải đấu',
        body: `${p.tournamentName}: đăng ký ngay.`,
      };
    case 'tournament.bracket_published':
      return {
        title: 'Bốc thăm xong',
        body: `Bảng đấu ${p.tournamentName} đã có. Xem đối thủ của bạn.`,
      };
    case 'tournament.match_scheduled':
      return {
        title: 'Lịch thi đấu',
        body: `Trận tiếp theo: ${p.opponent} · ${p.scheduledAt}.`,
      };
  }
};
