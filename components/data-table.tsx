"use client"

import * as React from "react"
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconCircleCheckFilled,
  IconDotsVertical,
  IconGripVertical,
  IconLayoutColumns,
  IconLoader,
  IconPlus,
  IconTrendingUp,
  IconTruck,
} from "@tabler/icons-react"
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type Row,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import { toast } from "sonner"
import { z } from "zod"

import { useIsMobile } from '@/hooks/use-mobile'
import type { Order } from '@/lib/actions/orders'
import { updateOrderDriver } from '@/lib/actions/orders'
import { getVehicles, type Vehicle } from '@/lib/actions/vehicles'
import { OrderTrackingDialog } from '@/components/order-tracking-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'

const CARRIER_OPTIONS = [
  "ТОО «КазМунайТранс»",
  "АО «Казмортрансфлот»",
  "ТОО «КаспийЛогистик»",
  "KTZE — KTZ Express",
  "ТОО «МангТрансОйл»",
  "АО «КазТрансОйл»",
]

function autoCarrier(orderId: number): string {
  return CARRIER_OPTIONS[orderId % CARRIER_OPTIONS.length]
}

function isValidCarrier(v: string): boolean {
  if (!v || v === "Не назначен") return false
  return (
    v.startsWith("ТОО") ||
    v.startsWith("АО") ||
    v.startsWith("KTZE") ||
    v.startsWith("ИП") ||
    v.includes("·") // маршрутный код рейса
  )
}

function DriverCell({
  orderId,
  currentDriver,
}: {
  orderId: number
  currentDriver: string
  drivers?: string[]
}) {
  const display = isValidCarrier(currentDriver)
    ? currentDriver
    : autoCarrier(orderId)

  return (
    <span className="text-sm text-foreground">{display}</span>
  )
}

const VEHICLE_STATUS_VARIANT: Record<Vehicle["status"], "default" | "secondary" | "outline"> = {
  "В рейсе": "default",
  "Свободна": "secondary",
  "На ТО": "outline",
}

const IN_TRANSIT_STATUSES = ["В пути", "Жолда"]
const DELIVERED_STATUSES = ["Доставлен", "Жеткізілді"]

export const schema = z.object({
  id: z.number(),
  header: z.string(),
  type: z.string(),
  status: z.string(),
  target: z.string(),
  limit: z.string(),
  reviewer: z.string(),
  senderName: z.string().nullable().optional(),
  senderAddress: z.string().nullable().optional(),
  recipientName: z.string().nullable().optional(),
  recipientAddress: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  deliveryDate: z.string().nullable().optional(),
})

// Create a separate component for the drag handle
function DragHandle({ id }: { id: number }) {
  const { attributes, listeners } = useSortable({
    id,
  })

  return (
    <Button
      {...attributes}
      {...listeners}
      variant="ghost"
      size="icon"
      className="size-7 text-muted-foreground hover:bg-transparent"
    >
      <IconGripVertical className="size-3 text-muted-foreground" />
      <span className="sr-only">Drag to reorder</span>
    </Button>
  )
}

const columns: ColumnDef<z.infer<typeof schema>>[] = [
  {
    id: "drag",
    header: () => null,
    cell: ({ row }) => <DragHandle id={row.original.id} />,
  },
  {
    id: "select",
    header: ({ table }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "header",
    header: "Номер заказа",
    cell: ({ row, table }) => {
      const meta = table.options.meta as { drivers?: string[] } | undefined
      return <TableCellViewer item={row.original} drivers={meta?.drivers} />
    },
    enableHiding: false,
  },
  {
    accessorKey: "type",
    header: "Тип груза",
    cell: ({ row }) => (
      <div className="w-32">
        <Badge variant="outline" className="px-1.5 text-muted-foreground">
          {row.original.type}
        </Badge>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Статус",
    cell: ({ row }) => (
      <Badge variant="outline" className="px-1.5 text-muted-foreground">
        {row.original.status === "Доставлен" ? (
          <IconCircleCheckFilled className="fill-green-500 dark:fill-green-400" />
        ) : (
          <IconLoader />
        )}
        {row.original.status}
      </Badge>
    ),
  },
  {
    accessorKey: "target",
    header: () => <div className="w-full text-right">Вес (кг)</div>,
    cell: ({ row }) => (
      <form
        onSubmit={(e) => {
          e.preventDefault()
          toast.promise(new Promise((resolve) => setTimeout(resolve, 1000)), {
            loading: `Saving ${row.original.header}`,
            success: "Done",
            error: "Error",
          })
        }}
      >
        <Label htmlFor={`${row.original.id}-target`} className="sr-only">
          Вес (кг)
        </Label>
        <Input
          className="h-8 w-16 border-transparent bg-transparent text-right shadow-none hover:bg-input/30 focus-visible:border focus-visible:bg-background dark:bg-transparent dark:hover:bg-input/30 dark:focus-visible:bg-input/30"
          defaultValue={row.original.target}
          id={`${row.original.id}-target`}
        />
      </form>
    ),
  },
  {
    accessorKey: "limit",
    header: () => <div className="w-full text-right">Объём (м³)</div>,
    cell: ({ row }) => (
      <form
        onSubmit={(e) => {
          e.preventDefault()
          toast.promise(new Promise((resolve) => setTimeout(resolve, 1000)), {
            loading: `Saving ${row.original.header}`,
            success: "Done",
            error: "Error",
          })
        }}
      >
        <Label htmlFor={`${row.original.id}-limit`} className="sr-only">
          Объём (м³)
        </Label>
        <Input
          className="h-8 w-16 border-transparent bg-transparent text-right shadow-none hover:bg-input/30 focus-visible:border focus-visible:bg-background dark:bg-transparent dark:hover:bg-input/30 dark:focus-visible:bg-input/30"
          defaultValue={row.original.limit}
          id={`${row.original.id}-limit`}
        />
      </form>
    ),
  },
  {
    accessorKey: "reviewer",
    header: "Перевозчик",
    cell: ({ row, table }) => {
      const meta = table.options.meta as { drivers?: string[] } | undefined
      return (
        <DriverCell
          orderId={row.original.id}
          currentDriver={row.original.reviewer}
          drivers={meta?.drivers}
        />
      )
    },
  },
  {
    id: "actions",
    cell: () => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex size-8 text-muted-foreground data-[state=open]:bg-muted"
            size="icon"
          >
            <IconDotsVertical />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32">
          <DropdownMenuItem>Редактировать</DropdownMenuItem>
          <DropdownMenuItem>Дублировать</DropdownMenuItem>
          <DropdownMenuItem>В избранное</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive focus:text-destructive">Удалить</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
]

function DraggableRow({ row }: { row: Row<z.infer<typeof schema>> }) {
  const { transform, transition, setNodeRef, isDragging } = useSortable({
    id: row.original.id,
  })

  return (
    <TableRow
      data-state={row.getIsSelected() && "selected"}
      data-dragging={isDragging}
      ref={setNodeRef}
      className="relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80"
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition,
      }}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell key={cell.id}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  )
}

export function DataTable({
  data: initialData,
}: {
  data: z.infer<typeof schema>[]
}) {
  const [data, setData] = React.useState(() => initialData)

  React.useEffect(() => {
    setData(initialData)
  }, [initialData])
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })
  const sortableId = React.useId()
  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {})
  )

  const dataIds = React.useMemo<UniqueIdentifier[]>(
    () => data?.map(({ id }) => id) || [],
    [data]
  )

  const inTransitData = React.useMemo(
    () => data.filter((row) => IN_TRANSIT_STATUSES.includes(row.status)),
    [data]
  )
  const archiveData = React.useMemo(
    () => data.filter((row) => DELIVERED_STATUSES.includes(row.status)),
    [data]
  )

  const [vehicles, setVehicles] = React.useState<Vehicle[]>([])
  const [vehiclesLoading, setVehiclesLoading] = React.useState(true)

  React.useEffect(() => {
    let active = true
    getVehicles().then((result) => {
      if (!active) return
      setVehicles(result)
      setVehiclesLoading(false)
    })
    return () => {
      active = false
    }
  }, [])

  const driverOptions = React.useMemo(
    () => {
      const fromVehicles = vehicles.map((v) => v.driver).filter(Boolean) as string[]
      return fromVehicles.length > 0 ? fromVehicles : CARRIER_OPTIONS
    },
    [vehicles]
  )

  const table = useReactTable({
    data,
    columns,
    meta: { drivers: driverOptions },
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
    },
    getRowId: (row) => row.id.toString(),
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (active && over && active.id !== over.id) {
      setData((data) => {
        const oldIndex = dataIds.indexOf(active.id)
        const newIndex = dataIds.indexOf(over.id)
        return arrayMove(data, oldIndex, newIndex)
      })
    }
  }

  return (
    <Tabs
      defaultValue="outline"
      className="w-full flex-col justify-start gap-6"
    >
      <div className="flex items-center justify-between px-4 lg:px-6">
        <Label htmlFor="view-selector" className="sr-only">
          Вид
        </Label>
        <Select defaultValue="outline">
          <SelectTrigger
            className="flex w-fit h-8 text-sm @4xl/main:hidden"
            id="view-selector"
          >
            <SelectValue placeholder="Выбрать вид" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="outline">Все заказы</SelectItem>
            <SelectItem value="past-performance">В пути</SelectItem>
            <SelectItem value="key-personnel">Водители</SelectItem>
            <SelectItem value="focus-documents">Архив</SelectItem>
          </SelectContent>
        </Select>
        <TabsList className="hidden **:data-[slot=badge]:size-5 **:data-[slot=badge]:rounded-full **:data-[slot=badge]:bg-muted-foreground/30 **:data-[slot=badge]:px-1 @4xl/main:flex">
          <TabsTrigger value="outline">Все заказы</TabsTrigger>
          <TabsTrigger value="past-performance">
            В пути <Badge variant="secondary">{inTransitData.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="key-personnel">
            Водители <Badge variant="secondary">{vehicles.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="focus-documents">
            Архив <Badge variant="secondary">{archiveData.length}</Badge>
          </TabsTrigger>
        </TabsList>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <IconLayoutColumns />
                <span className="hidden lg:inline">Настроить колонки</span>
                <span className="lg:hidden">Колонки</span>
                <IconChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {table
                .getAllColumns()
                .filter(
                  (column) =>
                    typeof column.accessorFn !== "undefined" &&
                    column.getCanHide()
                )
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm">
            <IconPlus />
            <span className="hidden lg:inline">Новый заказ</span>
          </Button>
        </div>
      </div>
      <TabsContent
        value="outline"
        className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6"
      >
        <div className="overflow-hidden rounded-lg border">
          <DndContext
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleDragEnd}
            sensors={sensors}
            id={sortableId}
          >
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      return (
                        <TableHead key={header.id} colSpan={header.colSpan}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      )
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody className="**:data-[slot=table-cell]:first:w-8">
                {table.getRowModel().rows?.length ? (
                  <SortableContext
                    items={dataIds}
                    strategy={verticalListSortingStrategy}
                  >
                    {table.getRowModel().rows.map((row) => (
                      <DraggableRow key={row.id} row={row} />
                    ))}
                  </SortableContext>
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      No results.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </DndContext>
        </div>
        <div className="flex items-center justify-between px-4">
          <div className="hidden flex-1 text-sm text-muted-foreground lg:flex">
            {table.getFilteredSelectedRowModel().rows.length} из{" "}
            {table.getFilteredRowModel().rows.length} заказов выбрано.
          </div>
          <div className="flex w-full items-center gap-8 lg:w-fit">
            <div className="hidden items-center gap-2 lg:flex">
              <Label htmlFor="rows-per-page" className="text-sm font-medium">
                Строк на странице
              </Label>
              <Select
                value={`${table.getState().pagination.pageSize}`}
                onValueChange={(value) => {
                  table.setPageSize(Number(value))
                }}
              >
                <SelectTrigger className="w-20 h-8 text-sm" id="rows-per-page">
                  <SelectValue
                    placeholder={table.getState().pagination.pageSize}
                  />
                </SelectTrigger>
                <SelectContent side="top">
                  {[10, 20, 30, 40, 50].map((pageSize) => (
                    <SelectItem key={pageSize} value={`${pageSize}`}>
                      {pageSize}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex w-fit items-center justify-center text-sm font-medium">
              Стр. {table.getState().pagination.pageIndex + 1} из{" "}
              {table.getPageCount()}
            </div>
            <div className="ml-auto flex items-center gap-2 lg:ml-0">
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">На первую страницу</span>
                <IconChevronsLeft />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Предыдущая страница</span>
                <IconChevronLeft />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Следующая страница</span>
                <IconChevronRight />
              </Button>
              <Button
                variant="outline"
                className="hidden size-8 lg:flex"
                size="icon"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">На последнюю страницу</span>
                <IconChevronsRight />
              </Button>
            </div>
          </div>
        </div>
      </TabsContent>
      <TabsContent
        value="past-performance"
        className="flex flex-col gap-4 px-4 lg:px-6"
      >
        {inTransitData.length === 0 ? (
          <div className="flex aspect-video w-full flex-1 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
            Сейчас нет заказов в пути
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader className="bg-muted">
                <TableRow>
                  <TableHead>Номер заказа</TableHead>
                  <TableHead>Тип груза</TableHead>
                  <TableHead className="text-right">Вес (кг)</TableHead>
                  <TableHead className="text-right">Объём (м³)</TableHead>
                  <TableHead>Перевозчик</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {inTransitData.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.header}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="px-1.5 text-muted-foreground">
                        {row.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{row.target}</TableCell>
                    <TableCell className="text-right">{row.limit}</TableCell>
                    <TableCell>{row.reviewer}</TableCell>
                    <TableCell className="text-right">
                      <OrderTrackingDialog
                        order={{
                          id: row.id,
                          order_number: row.header,
                          cargo_type: row.type,
                          status: row.status as Order["status"],
                          weight: null,
                          volume: null,
                          driver: row.reviewer === "Не назначен" ? null : row.reviewer,
                          delivery_date: row.deliveryDate ?? null,
                          sender_name: row.senderName ?? null,
                          sender_phone: null,
                          sender_address: row.senderAddress ?? null,
                          recipient_name: row.recipientName ?? null,
                          recipient_phone: null,
                          recipient_address: row.recipientAddress ?? null,
                          created_at: row.createdAt ?? new Date().toISOString(),
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </TabsContent>
      <TabsContent value="key-personnel" className="flex flex-col gap-4 px-4 lg:px-6">
        {vehiclesLoading ? (
          <div className="flex aspect-video w-full flex-1 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
            Загрузка автопарка...
          </div>
        ) : vehicles.length === 0 ? (
          <div className="flex aspect-video w-full flex-1 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
            В автопарке пока нет водителей — добавьте их на странице «Автопарк»
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 @xl/main:grid-cols-2 @5xl/main:grid-cols-3">
            {vehicles.map((v) => (
              <div key={v.id} className="flex flex-col gap-3 rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <IconTruck className="size-4 text-primary" />
                    {v.driver ?? "Не назначен"}
                  </span>
                  <Badge variant={VEHICLE_STATUS_VARIANT[v.status]}>{v.status}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {v.vehicle_code}
                  {v.plate ? ` • ${v.plate}` : ""}
                  {v.route && v.route !== "—" ? ` • ${v.route}` : ""}
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${v.load_percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </TabsContent>
      <TabsContent
        value="focus-documents"
        className="flex flex-col gap-4 px-4 lg:px-6"
      >
        {archiveData.length === 0 ? (
          <div className="flex aspect-video w-full flex-1 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
            В архиве пока нет доставленных заказов
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader className="bg-muted">
                <TableRow>
                  <TableHead>Номер заказа</TableHead>
                  <TableHead>Тип груза</TableHead>
                  <TableHead className="text-right">Вес (кг)</TableHead>
                  <TableHead className="text-right">Объём (м³)</TableHead>
                  <TableHead>Перевозчик</TableHead>
                  <TableHead>Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {archiveData.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.header}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="px-1.5 text-muted-foreground">
                        {row.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{row.target}</TableCell>
                    <TableCell className="text-right">{row.limit}</TableCell>
                    <TableCell>{row.reviewer}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="px-1.5 text-muted-foreground">
                        <IconCircleCheckFilled className="fill-green-500 dark:fill-green-400" />
                        {row.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </TabsContent>
    </Tabs>
  )
}

const chartData = [
  { month: "January", desktop: 186, mobile: 80 },
  { month: "February", desktop: 305, mobile: 200 },
  { month: "March", desktop: 237, mobile: 120 },
  { month: "April", desktop: 73, mobile: 190 },
  { month: "May", desktop: 209, mobile: 130 },
  { month: "June", desktop: 214, mobile: 140 },
]

const chartConfig = {
  desktop: {
    label: "Desktop",
    color: "var(--primary)",
  },
  mobile: {
    label: "Mobile",
    color: "var(--primary)",
  },
} satisfies ChartConfig

function TableCellViewer({ item, drivers = CARRIER_OPTIONS }: { item: z.infer<typeof schema>; drivers?: string[] }) {
  const isMobile = useIsMobile()

  return (
    <Drawer direction={isMobile ? "bottom" : "right"}>
      <DrawerTrigger asChild>
        <Button variant="link" className="w-fit px-0 text-left text-foreground">
          {item.header}
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="gap-1">
          <DrawerTitle>{item.header}</DrawerTitle>
          <DrawerDescription>
            Детали заказа за последние 6 месяцев
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-4 overflow-y-auto px-4 text-sm">
          {!isMobile && (
            <>
              <ChartContainer config={chartConfig}>
                <AreaChart
                  accessibilityLayer
                  data={chartData}
                  margin={{
                    left: 0,
                    right: 10,
                  }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => value.slice(0, 3)}
                    hide
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" />}
                  />
                  <Area
                    dataKey="mobile"
                    type="natural"
                    fill="var(--color-mobile)"
                    fillOpacity={0.6}
                    stroke="var(--color-mobile)"
                    stackId="a"
                  />
                  <Area
                    dataKey="desktop"
                    type="natural"
                    fill="var(--color-desktop)"
                    fillOpacity={0.4}
                    stroke="var(--color-desktop)"
                    stackId="a"
                  />
                </AreaChart>
              </ChartContainer>
              <Separator />
              <div className="grid gap-2">
                <div className="flex gap-2 leading-none font-medium">
                  Рост на 5.2% за этот месяц{" "}
                  <IconTrendingUp className="size-4" />
                </div>
                <div className="text-muted-foreground">
                  График отражает динамику по данному маршруту за последние 6 месяцев.
                </div>
              </div>
              <Separator />
            </>
          )}
          <form className="flex flex-col gap-4">
            <div className="flex flex-col gap-3">
              <Label htmlFor="header">Номер заказа</Label>
              <Input id="header" defaultValue={item.header} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-3">
                <Label htmlFor="type">Тип груза</Label>
                <Select defaultValue={item.type}>
                  <SelectTrigger id="type" className="w-full">
                    <SelectValue placeholder="Выбрать тип" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Нефтепродукты">Нефтепродукты</SelectItem>
                    <SelectItem value="Контейнер ТМТМ">Контейнер ТМТМ</SelectItem>
                    <SelectItem value="Металлопрокат">Металлопрокат</SelectItem>
                    <SelectItem value="Зерновые грузы">Зерновые грузы</SelectItem>
                    <SelectItem value="Строительные материалы">Строительные материалы</SelectItem>
                    <SelectItem value="Химические грузы">Химические грузы</SelectItem>
                    <SelectItem value="Автомобили">Автомобили</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-3">
                <Label htmlFor="status">Статус</Label>
                <Select defaultValue={item.status}>
                  <SelectTrigger id="status" className="w-full">
                    <SelectValue placeholder="Выбрать статус" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Доставлен">Доставлен</SelectItem>
                    <SelectItem value="В пути">В пути</SelectItem>
                    <SelectItem value="Ожидает отправки">Ожидает отправки</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-3">
                <Label htmlFor="target">Вес (кг)</Label>
                <Input id="target" defaultValue={item.target} />
              </div>
              <div className="flex flex-col gap-3">
                <Label htmlFor="limit">Объём (м³)</Label>
                <Input id="limit" defaultValue={item.limit} />
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <Label>Перевозчик</Label>
              <DriverCell orderId={item.id} currentDriver={item.reviewer} />
            </div>
          </form>
        </div>
        <DrawerFooter>
          <Button>Сохранить</Button>
          <DrawerClose asChild>
            <Button variant="outline">Закрыть</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
