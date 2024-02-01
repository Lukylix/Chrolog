# Get the PIDs of processes matching the pattern '[c]hrolog'
pids=$(ps aux | grep '[c]hrolog' | awk '{print $2}')

# Kill the processes with the obtained PIDs
for pid in $pids; do
    echo "Killing process $pid"
    kill $pid
done
