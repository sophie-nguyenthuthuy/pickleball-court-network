/**
 * Seed data: a couple of demo venues + courts in HCMC & HN so the app boots
 * with something visible. Idempotent — safe to re-run.
 */
import { PrismaClient, Sport, VenueStatus, CourtSurface, CourtKind, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const owner = await prisma.user.upsert({
    where: { phone: '+84909000001' },
    update: {},
    create: {
      phone: '+84909000001',
      phoneVerifiedAt: new Date(),
      displayName: 'Nguyễn Văn Chủ Sân',
      slug: 'nguyen-van-chu-san',
      city: 'Hồ Chí Minh',
      district: 'Quận 2',
      roles: [UserRole.COURT_OWNER],
    },
  });

  const player = await prisma.user.upsert({
    where: { phone: '+84909000002' },
    update: {},
    create: {
      phone: '+84909000002',
      phoneVerifiedAt: new Date(),
      displayName: 'Trần Thị Người Chơi',
      slug: 'tran-thi-nguoi-choi',
      city: 'Hồ Chí Minh',
      district: 'Quận 1',
      roles: [UserRole.PLAYER],
      preferredSport: Sport.PICKLEBALL,
    },
  });

  const venues = [
    {
      slug: 'thao-dien-pickleball-club',
      name: 'Thao Dien Pickleball Club',
      addressLine: '12 Nguyễn Văn Hưởng',
      ward: 'Thảo Điền',
      district: 'Quận 2',
      city: 'Hồ Chí Minh',
      latitude: 10.8035,
      longitude: 106.7405,
      courts: 4,
    },
    {
      slug: 'cau-giay-pickleball-arena',
      name: 'Cầu Giấy Pickleball Arena',
      addressLine: '88 Trần Thái Tông',
      ward: 'Dịch Vọng',
      district: 'Cầu Giấy',
      city: 'Hà Nội',
      latitude: 21.0294,
      longitude: 105.7906,
      courts: 6,
    },
  ];

  for (const v of venues) {
    const venue = await prisma.venue.upsert({
      where: { slug: v.slug },
      update: {},
      create: {
        ownerId: owner.id,
        name: v.name,
        slug: v.slug,
        sports: [Sport.PICKLEBALL],
        status: VenueStatus.ACTIVE,
        addressLine: v.addressLine,
        ward: v.ward,
        district: v.district,
        city: v.city,
        latitude: v.latitude,
        longitude: v.longitude,
        amenities: { parking: true, shower: true, racquetRental: true, proShop: false },
      },
    });

    for (let i = 1; i <= v.courts; i++) {
      const courtName = `Sân ${i}`;
      const court = await prisma.court.upsert({
        where: { venueId_name: { venueId: venue.id, name: courtName } },
        update: {},
        create: {
          venueId: venue.id,
          name: courtName,
          sport: Sport.PICKLEBALL,
          surface: CourtSurface.ACRYLIC,
          kind: i <= 2 ? CourtKind.INDOOR : CourtKind.OUTDOOR,
          hasLighting: true,
          sortOrder: i,
        },
      });

      // simple weekly schedule: Mon-Sun 06:00 - 22:00
      for (let day = 0; day < 7; day++) {
        await prisma.courtScheduleRule.upsert({
          where: {
            courtId_dayOfWeek_startMinute: { courtId: court.id, dayOfWeek: day, startMinute: 6 * 60 },
          },
          update: {},
          create: {
            courtId: court.id,
            dayOfWeek: day,
            startMinute: 6 * 60,
            endMinute: 22 * 60,
            basePriceVnd: BigInt(180_000),
            peakPriceVnd: BigInt(260_000),
            peakWindows: [
              { startMinute: 17 * 60, endMinute: 21 * 60 },
            ],
          },
        });
      }
    }
  }

  // notification prefs
  for (const u of [owner, player]) {
    await prisma.notificationPreference.upsert({
      where: { userId: u.id },
      update: {},
      create: { userId: u.id },
    });
  }

  console.info('Seed complete.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
