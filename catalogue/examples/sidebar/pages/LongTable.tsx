import {Badge} from '@astryxdesign/core/Badge';
import {Table, TableBody, TableCell, TableHeader, TableHeaderCell, TableRow} from '@astryxdesign/core/Table';
import './long-table.css';

const departments = ['Operations', 'Production', 'Engineering', 'Design', 'Support'];
const statuses = ['Active', 'Pending', 'Complete'] as const;
const rows = Array.from({length: 500}, (_, index) => ({
  id: `DF-${String(index + 1).padStart(4, '0')}`,
  name: `Workspace record ${String(index + 1).padStart(3, '0')}`,
  department: departments[index % departments.length],
  owner: ['Alex Johnson', 'Jamie Davis', 'Sam Taylor', 'Morgan Lee'][index % 4],
  status: statuses[index % statuses.length],
  date: `2026-09-${String(index % 28 + 1).padStart(2, '0')}`,
}));

export function LongTable() {
  return (
    <div className="long-table">
      <Table aria-label="Workspace records" density="balanced" dividers="rows" isStriped hasHover>
        <TableHeader>
          <TableRow>
            {['ID', 'Record', 'Department', 'Owner', 'Status', 'Updated'].map((label) => <TableHeaderCell key={label}>{label}</TableHeaderCell>)}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((record) => (
            <TableRow key={record.id} data-testid={`record-${record.id}`}>
              <TableCell>{record.id}</TableCell><TableCell>{record.name}</TableCell>
              <TableCell>{record.department}</TableCell><TableCell>{record.owner}</TableCell>
              <TableCell><Badge label={record.status} variant={record.status === 'Active' ? 'info' : record.status === 'Pending' ? 'warning' : 'success'} /></TableCell>
              <TableCell>{record.date}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
