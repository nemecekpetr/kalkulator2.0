import { Suspense } from 'react'
import { listSignatureBanners } from '@/app/actions/signature-banners-actions'
import { EmailBannerList } from '@/components/admin/email-banner-list'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'

export const dynamic = 'force-dynamic'

async function BannersContent() {
  const { banners, error } = await listSignatureBanners()

  if (error) {
    return <p className="text-destructive">{error}</p>
  }

  return <EmailBannerList initialBanners={banners} />
}

function BannersLoading() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

export default function EmailBannersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Email bannery</h1>
        <p className="text-muted-foreground">
          Knihovna sezónních bannerů, ze kterých si pracovníci vybírají do svých emailových podpisů.
          Jeden banner může být označen jako evergreen (výchozí).
        </p>
      </div>

      <Separator />

      <Suspense fallback={<BannersLoading />}>
        <BannersContent />
      </Suspense>
    </div>
  )
}
