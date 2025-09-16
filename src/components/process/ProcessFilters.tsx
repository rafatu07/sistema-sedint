import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Search, CalendarIcon, Filter, X, Download } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Process } from '@/types/process';

interface ProcessFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  localFilter: string;
  setLocalFilter: (local: string) => void;
  dateFilter: Date | null;
  setDateFilter: (date: Date | null) => void;
  priorityFilter: string;
  setPriorityFilter: (priority: string) => void;
  onExport: () => void;
  processes: Process[];
}

export function ProcessFilters({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  localFilter,
  setLocalFilter,
  dateFilter,
  setDateFilter,
  priorityFilter,
  setPriorityFilter,
  onExport,
  processes
}: ProcessFiltersProps) {
  const uniqueLocals = Array.from(new Set(processes.map(p => p.local))).sort();
  
  const activeFilters = [
    statusFilter && statusFilter !== 'all' && { key: 'status', label: `Status: ${statusFilter}`, clear: () => setStatusFilter('all') },
    localFilter && localFilter !== 'all' && { key: 'local', label: `Local: ${localFilter}`, clear: () => setLocalFilter('all') },
    priorityFilter && priorityFilter !== 'all' && { key: 'priority', label: `Prioridade: ${priorityFilter}`, clear: () => setPriorityFilter('all') },
    dateFilter && { 
      key: 'date', 
      label: `Data: ${format(dateFilter, 'dd/MM/yyyy', { locale: ptBR })}`, 
      clear: () => setDateFilter(null) 
    }
  ].filter(Boolean);

  const clearAllFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setLocalFilter('all');
    setPriorityFilter('all');
    setDateFilter(null);
  };

  return (
    <div className="space-y-4">
      {/* Search and Export */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar processos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={onExport} variant="outline" className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Exportar
        </Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="em_andamento">Em Andamento</SelectItem>
            <SelectItem value="concluido">Concluído</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>

        <Select value={localFilter} onValueChange={setLocalFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Local/Setor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os locais</SelectItem>
            {uniqueLocals.map(local => (
              <SelectItem key={local} value={local}>{local}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Prioridade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as prioridades</SelectItem>
            <SelectItem value="baixa">Baixa</SelectItem>
            <SelectItem value="media">Média</SelectItem>
            <SelectItem value="alta">Alta</SelectItem>
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-start text-left font-normal",
                !dateFilter && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateFilter ? format(dateFilter, "dd/MM/yyyy", { locale: ptBR }) : "Data"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateFilter || undefined}
              onSelect={(date) => setDateFilter(date || null)}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>

        {activeFilters.length > 0 && (
          <Button variant="ghost" onClick={clearAllFilters} className="justify-start">
            <X className="mr-2 h-4 w-4" />
            Limpar filtros
          </Button>
        )}
      </div>

      {/* Active Filters */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-muted-foreground flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros ativos:
          </span>
          {activeFilters.map((filter) => (
            <Badge key={filter.key} variant="secondary" className="gap-1">
              {filter.label}
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 hover:bg-transparent"
                onClick={filter.clear}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}