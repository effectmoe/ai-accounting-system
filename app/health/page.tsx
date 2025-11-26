'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RefreshCw, CheckCircle, XCircle, AlertTriangle, Clock, Info } from "lucide-react"

interface HealthStatus {
  timestamp: string
  system: string
  version: string
  environment: string
  configuration: {
    useAzureMongoDB: boolean
    azureFormRecognizer: {
      configured: boolean
      endpoint: string
    }
    mongodb: {
      configured: boolean
      atlas: boolean
    }
    deepseek: {
      configured: boolean
      status: string
    }
    googleServices: {
      configured: boolean
      status: string
    }
    supabase: {
      configured: boolean
      status: string
    }
    vercelKv: {
      configured: boolean
      status: string
    }
  }
  services: {
    webServer: string
    azureFormRecognizer: string
    mongodb: string
    deepseekApi: string
    googleServices: string
    supabase: string
    vercelKv: string
  }
  endpoints: {
    health: string
    envCheck: string
    accounts: string
    customers: string
    invoices: string
    contracts: string
  }
}

interface EnvStatus {
  success: boolean
  system: string
  allConfigured: boolean
  completeness: string
  configuredCount: number
  totalCount: number
  environment: string
  vercelEnv: string
  mongodbInfo: string
  criticalMissing: string[]
  categoryCompleteness: Record<string, {
    total: number
    configured: number
    percentage: number
  }>
  recommendations: {
    critical: string
    contractSystem: string
    kvStorage: string
  }
}

export default function HealthCheckPage() {
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null)
  const [envStatus, setEnvStatus] = useState<EnvStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [lastChecked, setLastChecked] = useState<string>('')
  const [error, setError] = useState<string>('')

  const fetchHealthStatus = async () => {
    setLoading(true)
    setError('')
    
    try {
      const [healthRes, envRes] = await Promise.all([
        fetch('/api/health'),
        fetch('/api/env-check')
      ])

      if (!healthRes.ok || !envRes.ok) {
        throw new Error(`Health: ${healthRes.status}, Env: ${envRes.status}`)
      }

      const healthData = await healthRes.json()
      const envData = await envRes.json()

      setHealthStatus(healthData)
      setEnvStatus(envData)
      setLastChecked(new Date().toLocaleString('ja-JP'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ヘルスチェックに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHealthStatus()
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'configured':
        return <CheckCircle className="w-4 h-4 text-blue-500" />
      case 'unhealthy':
      case 'error':
      case 'not_configured':
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge variant="default" className="bg-green-500">正常</Badge>
      case 'configured':
        return <Badge variant="secondary">設定済み</Badge>
      case 'unhealthy':
        return <Badge variant="destructive">異常</Badge>
      case 'error':
        return <Badge variant="destructive">エラー</Badge>
      case 'not_configured':
        return <Badge variant="outline">未設定</Badge>
      default:
        return <Badge variant="secondary">不明</Badge>
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">システムヘルスチェック</h1>
        <p className="text-muted-foreground">
          AAM会計システム・契約システムの動作状況を確認できます
        </p>
      </div>

      <div className="mb-6 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button onClick={fetchHealthStatus} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            ヘルスチェック実行
          </Button>
          {lastChecked && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              最終確認: {lastChecked}
            </div>
          )}
        </div>
      </div>

      {error && (
        <Alert className="mb-6" variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>エラーが発生しました</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {healthStatus && envStatus && (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">概要</TabsTrigger>
            <TabsTrigger value="services">サービス状態</TabsTrigger>
            <TabsTrigger value="environment">環境変数</TabsTrigger>
            <TabsTrigger value="endpoints">APIエンドポイント</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">システム情報</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">システム:</span>
                    <span className="text-sm">{healthStatus.system}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">バージョン:</span>
                    <span className="text-sm">{healthStatus.version}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">環境:</span>
                    <Badge variant="outline">{healthStatus.environment}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Vercel環境:</span>
                    <Badge variant="outline">{envStatus.vercelEnv || 'N/A'}</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">環境変数設定</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">設定完了率:</span>
                      <span className="text-lg font-bold">{envStatus.completeness}</span>
                    </div>
                    <Progress value={parseInt(envStatus.completeness)} className="w-full" />
                    <div className="text-xs text-muted-foreground">
                      {envStatus.configuredCount} / {envStatus.totalCount} 項目設定済み
                    </div>
                    {envStatus.criticalMissing.length > 0 && (
                      <Alert variant="destructive" className="mt-3">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          必須項目未設定: {envStatus.criticalMissing.join(', ')}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">全体ステータス</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(healthStatus.services).map(([service, status]) => (
                      <div key={service} className="flex items-center justify-between">
                        <span className="text-sm capitalize">{service}:</span>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(status)}
                          {getStatusBadge(status)}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {envStatus.recommendations && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="w-5 h-5" />
                    推奨事項
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Alert>
                    <AlertTitle>重要な設定</AlertTitle>
                    <AlertDescription>{envStatus.recommendations.critical}</AlertDescription>
                  </Alert>
                  <Alert>
                    <AlertTitle>契約システム</AlertTitle>
                    <AlertDescription>{envStatus.recommendations.contractSystem}</AlertDescription>
                  </Alert>
                  <Alert>
                    <AlertTitle>KVストレージ</AlertTitle>
                    <AlertDescription>{envStatus.recommendations.kvStorage}</AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="services">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>サービス状態</CardTitle>
                  <CardDescription>各サービスの現在の動作状況</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(healthStatus.services).map(([service, status]) => (
                    <div key={service} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(status)}
                        <span className="font-medium capitalize">{service.replace(/([A-Z])/g, ' $1').trim()}</span>
                      </div>
                      {getStatusBadge(status)}
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>設定詳細</CardTitle>
                  <CardDescription>各サービスの設定状況</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(healthStatus.configuration).map(([key, config]) => {
                    if (typeof config === 'boolean') {
                      return (
                        <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                          <span className="font-medium">{key}</span>
                          {config ? (
                            <Badge variant="default" className="bg-green-500">有効</Badge>
                          ) : (
                            <Badge variant="outline">無効</Badge>
                          )}
                        </div>
                      )
                    }
                    
                    if (typeof config === 'object' && config !== null) {
                      const isConfigured = 'configured' in config ? config.configured : false
                      return (
                        <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                          <span className="font-medium">{key}</span>
                          {isConfigured ? (
                            <Badge variant="default" className="bg-blue-500">設定済み</Badge>
                          ) : (
                            <Badge variant="destructive">未設定</Badge>
                          )}
                        </div>
                      )
                    }
                    
                    return null
                  })}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="environment">
            <Card>
              <CardHeader>
                <CardTitle>環境変数設定状況</CardTitle>
                <CardDescription>カテゴリ別の環境変数設定完了率</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(envStatus.categoryCompleteness).map(([category, stats]) => (
                    <Card key={category}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base capitalize">
                          {category.replace(/([A-Z])/g, ' $1').trim()}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm">完了率:</span>
                            <span className="font-bold">{stats.percentage}%</span>
                          </div>
                          <Progress value={stats.percentage} />
                          <div className="text-xs text-muted-foreground">
                            {stats.configured} / {stats.total} 設定済み
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="endpoints">
            <Card>
              <CardHeader>
                <CardTitle>APIエンドポイント</CardTitle>
                <CardDescription>利用可能なAPIエンドポイント一覧</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {Object.entries(healthStatus.endpoints).map(([name, path]) => (
                    <div key={name} className="flex items-center justify-between p-3 border rounded-lg">
                      <span className="font-medium capitalize">{name}</span>
                      <code className="px-2 py-1 bg-muted rounded text-sm">{path}</code>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}